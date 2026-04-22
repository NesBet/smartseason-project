require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const { requireAuth, requireRole } = require("./auth");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const sseClients = new Map();

const sseAdd = (userId, res) => {
  if (!sseClients.has(userId)) sseClients.set(userId, new Set());
  sseClients.get(userId).add(res);
};
const sseRemove = (userId, res) => {
  sseClients.get(userId)?.delete(res);
};
const sseSend = (userId, event, data) => {
  sseClients.get(userId)?.forEach((res) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  });
};

// Helper to send events to all admins
const sseSendToAdmins = async (event, data) => {
  const result = await pool.query("SELECT id FROM users WHERE role = 'Admin'");
  result.rows.forEach((admin) => {
    sseSend(admin.id, event, data);
  });
};

// Helper to send event to a specific field's agent and customer
const sseSendToFieldParties = async (fieldId, event, data) => {
  const result = await pool.query(
    "SELECT agent_id, customer_id FROM fields WHERE id = $1",
    [fieldId],
  );
  if (result.rows.length) {
    const { agent_id, customer_id } = result.rows[0];
    if (agent_id) sseSend(agent_id, event, data);
    if (customer_id) sseSend(customer_id, event, data);
  }
};

// Helper to record field update and trigger last_update
const recordFieldUpdate = async (fieldId, agentId, stage, notes) => {
  const updateNotes = notes || `Field updated to stage: ${stage}`;
  await pool.query(
    `INSERT INTO field_updates (field_id, agent_id, stage, notes, created_at)
     VALUES ($1, $2, $3, $4, NOW())`,
    [fieldId, agentId, stage, updateNotes],
  );
};

// Helpers
const computeStatus = (field, lastUpdateDate) => {
  if (field.current_stage === "Harvested") return "Completed";
  const daysSinceUpdate = lastUpdateDate
    ? (new Date() - new Date(lastUpdateDate)) / (1000 * 60 * 60 * 24)
    : (new Date() - new Date(field.planting_date)) / (1000 * 60 * 60 * 24);
  if (daysSinceUpdate > 14) return "At Risk";
  return "Active";
};

const fieldsQuery = `
  SELECT
    f.*,
    agent.email  AS agent_email,
    cust.email   AS customer_email,
    (SELECT created_at FROM field_updates
     WHERE field_id = f.id ORDER BY created_at DESC LIMIT 1) AS last_update
  FROM fields f
  LEFT JOIN users agent ON f.agent_id    = agent.id
  LEFT JOIN users cust  ON f.customer_id = cust.id
`;

const withStatus = (rows) =>
  rows.map((f) => ({ ...f, computed_status: computeStatus(f, f.last_update) }));

// Auth
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    if (!result.rows.length)
      return res.status(404).json({ error: "User not found" });
    const user = result.rows[0];
    if (user.password_hash) {
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) return res.status(401).json({ error: "Invalid password" });
    }
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "8h" },
    );
    res.json({
      token,
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/signup", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "All fields are required." });
    if (password.length < 8)
      return res.status(400).json({ error: "Password too short." });
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (email, role, password_hash) VALUES ($1, $2, $3) RETURNING id, email, role",
      [email, "Customer", hash],
    );
    res.status(201).json({ user: result.rows[0] });
  } catch (err) {
    if (err.code === "23505")
      return res.status(409).json({ error: "Email already registered." });
    res.status(500).json({ error: err.message });
  }
});

// client subscribes to events
app.get("/api/events", (req, res) => {
  const token = req.query.token || req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).end();

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).end();
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const heartbeat = setInterval(() => res.write(": heartbeat\n\n"), 25000);

  const userId = decoded.id;
  sseAdd(userId, res);

  req.on("close", () => {
    clearInterval(heartbeat);
    sseRemove(userId, res);
  });
});

// Admin: Fields
app.get(
  "/api/admin/fields",
  requireAuth,
  requireRole("Admin"),
  async (req, res) => {
    try {
      const result = await pool.query(
        fieldsQuery + " ORDER BY f.created_at DESC",
      );
      res.json(withStatus(result.rows));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

app.put(
  "/api/admin/fields/:id",
  requireAuth,
  requireRole("Admin"),
  async (req, res) => {
    try {
      const { name, crop_type, current_stage, agent_id, customer_id, notes } =
        req.body;

      // Get old field data to determine changes
      const oldField = await pool.query("SELECT * FROM fields WHERE id = $1", [
        req.params.id,
      ]);

      await pool.query(
        `UPDATE fields
         SET name=$1, crop_type=$2, current_stage=$3, agent_id=$4, customer_id=$5
         WHERE id=$6`,
        [
          name,
          crop_type,
          current_stage,
          agent_id || null,
          customer_id || null,
          req.params.id,
        ],
      );

      // Record the update with notes
      const updateNotes = notes || `Field updated by Admin: ${name}`;
      await recordFieldUpdate(
        req.params.id,
        req.user.id,
        current_stage,
        updateNotes,
      );

      // Send SSE events
      await sseSendToAdmins("refresh-fields", {});
      await sseSendToFieldParties(req.params.id, "refresh-fields", {});

      res.json({ message: "Field updated." });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

app.delete(
  "/api/admin/fields/:id",
  requireAuth,
  requireRole("Admin"),
  async (req, res) => {
    try {
      // Get field info before deleting for SSE
      const field = await pool.query(
        "SELECT agent_id, customer_id FROM fields WHERE id = $1",
        [req.params.id],
      );

      await pool.query("DELETE FROM fields WHERE id=$1", [req.params.id]);

      // Send SSE events
      await sseSendToAdmins("refresh-fields", {});
      if (field.rows.length) {
        if (field.rows[0].agent_id)
          sseSend(field.rows[0].agent_id, "refresh-fields", {});
        if (field.rows[0].customer_id)
          sseSend(field.rows[0].customer_id, "refresh-fields", {});
      }

      res.json({ message: "Field deleted." });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

// Admin: Users
app.get(
  "/api/admin/users",
  requireAuth,
  requireRole("Admin"),
  async (req, res) => {
    try {
      const result = await pool.query(
        "SELECT id, email, role FROM users ORDER BY role, email",
      );
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

app.put(
  "/api/admin/users/:id",
  requireAuth,
  requireRole("Admin"),
  async (req, res) => {
    try {
      const { role } = req.body;
      if (!["Admin", "Field Agent", "Customer"].includes(role))
        return res.status(400).json({ error: "Invalid role." });

      // Get old role before update
      const oldUser = await pool.query("SELECT role FROM users WHERE id = $1", [
        req.params.id,
      ]);
      const oldRole = oldUser.rows[0]?.role;

      const result = await pool.query(
        "UPDATE users SET role=$1 WHERE id=$2 RETURNING id, email, role",
        [role, req.params.id],
      );
      const updated = result.rows[0];

      // If role changed from Field Agent
      if (oldRole === "Field Agent" && role !== "Field Agent") {
        await pool.query(
          "UPDATE fields SET agent_id = NULL WHERE agent_id = $1",
          [req.params.id],
        );
      }
      // If role changed from Customer
      if (oldRole === "Customer" && role !== "Customer") {
        await pool.query(
          "UPDATE fields SET customer_id = NULL WHERE customer_id = $1",
          [req.params.id],
        );
      }

      // Fresh token for the affected user
      const newToken = jwt.sign(
        { id: updated.id, email: updated.email, role: updated.role },
        process.env.JWT_SECRET,
        { expiresIn: "8h" },
      );

      // Push the new token to the affected user
      sseSend(updated.id, "role-changed", { user: updated, token: newToken });

      // Notify admins to refresh users and fields
      await sseSendToAdmins("refresh-users", {});
      await sseSendToAdmins("refresh-fields", {});
      await sseSendToAdmins("refresh-dropdowns", {});

      res.json({ message: "Role updated.", user: updated, token: newToken });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

app.delete(
  "/api/admin/users/:id",
  requireAuth,
  requireRole("Admin"),
  async (req, res) => {
    try {
      if (parseInt(req.params.id) === req.user.id)
        return res
          .status(400)
          .json({ error: "You cannot delete your own account." });

      // Get user info before deleting
      const userToDelete = await pool.query(
        "SELECT role FROM users WHERE id = $1",
        [req.params.id],
      );

      // Unassign fields owned by this user
      if (userToDelete.rows[0]?.role === "Field Agent") {
        await pool.query(
          "UPDATE fields SET agent_id = NULL WHERE agent_id = $1",
          [req.params.id],
        );
      }
      if (userToDelete.rows[0]?.role === "Customer") {
        await pool.query(
          "UPDATE fields SET customer_id = NULL WHERE customer_id = $1",
          [req.params.id],
        );
      }

      await pool.query("DELETE FROM users WHERE id=$1", [req.params.id]);

      // Notify admins to refresh
      await sseSendToAdmins("refresh-users", {});
      await sseSendToAdmins("refresh-fields", {});
      await sseSendToAdmins("refresh-dropdowns", {});

      res.json({ message: "User deleted." });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

// Agent: Fields
app.get(
  "/api/agent/fields",
  requireAuth,
  requireRole("Field Agent"),
  async (req, res) => {
    try {
      const result = await pool.query(
        fieldsQuery + " WHERE f.agent_id=$1 ORDER BY f.created_at DESC",
        [req.user.id],
      );
      res.json(withStatus(result.rows));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

app.post(
  "/api/agent/fields",
  requireAuth,
  requireRole("Field Agent"),
  async (req, res) => {
    try {
      const { name, crop_type, planting_date, current_stage, customer_id } =
        req.body;
      if (!name || !crop_type || !planting_date)
        return res
          .status(400)
          .json({ error: "Name, crop type, and planting date are required." });

      const result = await pool.query(
        `INSERT INTO fields (name, crop_type, planting_date, current_stage, agent_id, customer_id)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [
          name,
          crop_type,
          planting_date,
          current_stage || "Planted",
          req.user.id,
          customer_id || null,
        ],
      );

      // Record initial field update
      await recordFieldUpdate(
        result.rows[0].id,
        req.user.id,
        current_stage || "Planted",
        "Field created",
      );

      // Notify relevant parties
      await sseSendToAdmins("refresh-fields", {});
      if (customer_id) sseSend(customer_id, "refresh-fields", {});

      res.status(201).json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

app.put(
  "/api/agent/fields/:id",
  requireAuth,
  requireRole("Field Agent"),
  async (req, res) => {
    try {
      const {
        name,
        crop_type,
        planting_date,
        current_stage,
        customer_id,
        notes,
      } = req.body;
      const check = await pool.query(
        "SELECT id, customer_id FROM fields WHERE id=$1 AND agent_id=$2",
        [req.params.id, req.user.id],
      );
      if (!check.rows.length)
        return res
          .status(403)
          .json({ error: "You can only edit your own fields." });

      const oldCustomerId = check.rows[0].customer_id;

      await pool.query(
        `UPDATE fields SET name=$1, crop_type=$2, planting_date=$3,
         current_stage=$4, customer_id=$5 WHERE id=$6`,
        [
          name,
          crop_type,
          planting_date,
          current_stage,
          customer_id || null,
          req.params.id,
        ],
      );

      // Always record the update with notes
      await recordFieldUpdate(
        req.params.id,
        req.user.id,
        current_stage,
        notes || "Field updated by agent",
      );

      // Notify relevant parties
      await sseSendToAdmins("refresh-fields", {});
      sseSend(req.user.id, "refresh-fields", {});
      if (customer_id && customer_id !== oldCustomerId) {
        if (oldCustomerId) sseSend(oldCustomerId, "refresh-fields", {});
        sseSend(customer_id, "refresh-fields", {});
      } else if (customer_id) {
        sseSend(customer_id, "refresh-fields", {});
      }

      res.json({ message: "Field updated." });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

// Customer: Fields
app.get(
  "/api/customer/fields",
  requireAuth,
  requireRole("Customer"),
  async (req, res) => {
    try {
      const result = await pool.query(
        fieldsQuery + " WHERE f.customer_id=$1 ORDER BY f.created_at DESC",
        [req.user.id],
      );
      res.json(withStatus(result.rows));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

// list customers (for agent dropdown) ───────────────────
app.get("/api/customers", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, email FROM users WHERE role='Customer' ORDER BY email",
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// list agents (for admin reassign dropdown)
app.get("/api/agents", requireAuth, requireRole("Admin"), async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, email FROM users WHERE role='Field Agent' ORDER BY email",
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log("Server running on port 3000"));
