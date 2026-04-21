import { useState, useEffect, useRef } from "react";
import api from "./api";
import ThemeToggle from "./ThemeToggle";

// ── Timestamp helper ─────────────────────────────────────────────
const formatTs = (ts) => {
  if (!ts) return "—";
  const d = new Date(ts);
  return (
    d.toLocaleDateString("en-US", {
      month: "numeric",
      day: "numeric",
      year: "numeric",
    }) +
    " at " +
    d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  );
};

// ── Badges ───────────────────────────────────────────────────────
const statusBadge = (status) => {
  const map = {
    Active:
      "bg-green-50  text-green-700  border-green-200  dark:bg-green-900/30  dark:text-green-400  dark:border-green-800",
    "At Risk":
      "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800",
    Completed:
      "bg-gray-100  text-gray-500   border-gray-200   dark:bg-gray-800      dark:text-gray-400   dark:border-gray-700",
  };
  const dot = {
    Active: "bg-green-500",
    "At Risk": "bg-orange-500",
    Completed: "bg-gray-400",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${map[status] || ""}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot[status] || "bg-gray-400"}`}
      />
      {status}
    </span>
  );
};

// ── Searchable customer dropdown ─────────────────────────────────
function CustomerSelect({
  customers,
  value,
  onChange,
  placeholder = "Select customer",
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = customers.filter((c) =>
    c.email.toLowerCase().includes(search.toLowerCase()),
  );
  const selected = customers.find((c) => c.id === value);
  const base =
    "w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`${base} text-left flex items-center justify-between`}
      >
        <span
          className={
            selected
              ? "text-gray-900 dark:text-white"
              : "text-gray-400 dark:text-gray-600"
          }
        >
          {selected ? selected.email : placeholder}
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-gray-100 dark:border-gray-800">
            <input
              autoFocus
              className="w-full px-2.5 py-1.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
              placeholder="Search customers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
                setSearch("");
              }}
              className="w-full text-left px-3 py-2 text-sm text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              None
            </button>
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-sm text-gray-400 dark:text-gray-500">
                No customers found
              </p>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    onChange(c.id);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={`w-full text-left px-3 py-2 text-sm transition ${value === c.id ? "bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400" : "text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800"}`}
                >
                  {c.email}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Confirm modal ────────────────────────────────────────────────
function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 w-80 shadow-2xl">
        <div className="w-10 h-10 bg-red-50 dark:bg-red-900/30 rounded-xl flex items-center justify-center mb-4">
          <svg
            className="w-5 h-5 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            />
          </svg>
        </div>
        <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
          Are you sure?
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">
          {message}
        </p>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-700 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 text-xs font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl transition"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Field modal ──────────────────────────────────────────────────
function FieldModal({ field, onSave, onClose, customers, agents, isAdmin }) {
  const isNew = !field?.id;
  const [form, setForm] = useState({
    name: field?.name || "",
    crop_type: field?.crop_type || "",
    planting_date: field?.planting_date
      ? field.planting_date.split("T")[0]
      : "",
    current_stage: field?.current_stage || "Planted",
    customer_id: field?.customer_id ?? null,
    agent_id: field?.agent_id ?? null,
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name || !form.crop_type || !form.planting_date)
      return setError("Name, crop type and planting date are required.");
    setSaving(true);
    setError("");
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save field.");
    } finally {
      setSaving(false);
    }
  };

  const iCls =
    "w-full px-3.5 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition";
  const lCls =
    "block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            {isNew ? "Add new field" : "Edit field"}
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className={lCls}>Field name</label>
            <input
              className={iCls}
              placeholder="e.g. North Plot"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>
          <div>
            <label className={lCls}>Crop type</label>
            <input
              className={iCls}
              placeholder="e.g. Maize"
              value={form.crop_type}
              onChange={(e) => set("crop_type", e.target.value)}
            />
          </div>
          <div>
            <label className={lCls}>Planting date</label>
            <input
              className={iCls}
              type="date"
              value={form.planting_date}
              onChange={(e) => set("planting_date", e.target.value)}
            />
          </div>
          <div>
            <label className={lCls}>Stage</label>
            <select
              className={iCls}
              value={form.current_stage}
              onChange={(e) => set("current_stage", e.target.value)}
            >
              {["Planted", "Growing", "Ready", "Harvested"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={lCls}>Customer</label>
            <CustomerSelect
              customers={customers}
              value={form.customer_id}
              onChange={(id) => set("customer_id", id)}
              placeholder="Assign to customer..."
            />
          </div>
          {isAdmin && (
            <div>
              <label className={lCls}>Assigned agent</label>
              <select
                className={iCls}
                value={form.agent_id ?? ""}
                onChange={(e) =>
                  set(
                    "agent_id",
                    e.target.value ? parseInt(e.target.value) : null,
                  )
                }
              >
                <option value="">No agent</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.email}
                  </option>
                ))}
              </select>
            </div>
          )}
          {!isNew && (
            <div>
              <label className={lCls}>Update notes (optional)</label>
              <textarea
                className={`${iCls} resize-none`}
                rows={3}
                placeholder="Add observations..."
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
              />
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50 rounded-xl">
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <div className="flex gap-2 mt-5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-700 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-teal-500 to-green-600 hover:from-teal-600 hover:to-green-700 disabled:opacity-50 rounded-xl transition shadow-md shadow-teal-500/20"
          >
            {saving ? "Saving..." : isNew ? "Create field" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Dashboard ───────────────────────────────────────────────
export default function Dashboard({ user, onLogout }) {
  const [tab, setTab] = useState("fields");
  const [fields, setFields] = useState([]);
  const [users, setUsers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [agentFilter, setAgentFilter] = useState("all");
  const [fieldModal, setFieldModal] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const isAdmin = user.role === "Admin";
  const isAgent = user.role === "Field Agent";
  const isCustomer = user.role === "Customer";

  const getEndpoint = () =>
    isAdmin
      ? "/api/admin/fields"
      : isAgent
        ? "/api/agent/fields"
        : "/api/customer/fields";

  const refreshFields = () =>
    api.get(getEndpoint()).then((r) => setFields(r.data));
  const refreshUsers = () =>
    api.get("/api/admin/users").then((r) => setUsers(r.data));

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const calls = [
      api.get(getEndpoint()).then((r) => {
        if (!cancelled) setFields(r.data);
      }),
      api.get("/api/customers").then((r) => {
        if (!cancelled) setCustomers(r.data);
      }),
    ];
    if (isAdmin) {
      calls.push(
        api.get("/api/admin/users").then((r) => {
          if (!cancelled) setUsers(r.data);
        }),
      );
      calls.push(
        api.get("/api/agents").then((r) => {
          if (!cancelled) setAgents(r.data);
        }),
      );
    }
    Promise.all(calls)
      .catch(() => {
        if (!cancelled) setError("Failed to load data.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user.role]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    onLogout();
  };

  const handleCreateField = async (form) => {
    await api.post("/api/agent/fields", form);
    await refreshFields();
  };
  const handleUpdateField = async (id, form) => {
    await api.put(
      isAdmin ? `/api/admin/fields/${id}` : `/api/agent/fields/${id}`,
      form,
    );
    await refreshFields();
  };
  const handleDeleteField = async (id) => {
    await api.delete(`/api/admin/fields/${id}`);
    await refreshFields();
    setConfirmDelete(null);
  };
  const handleUpdateRole = async (id, role) => {
    await api.put(`/api/admin/users/${id}`, { role });
    await refreshUsers();
  };
  const handleDeleteUser = async (id) => {
    await api.delete(`/api/admin/users/${id}`);
    await refreshUsers();
    setConfirmDelete(null);
  };

  const agentEmails = [
    ...new Set(fields.map((f) => f.agent_email).filter(Boolean)),
  ];
  const filteredFields =
    agentFilter === "all"
      ? fields
      : fields.filter((f) => f.agent_email === agentFilter);

  const stats = [
    {
      label: "Total",
      value: filteredFields.length,
      color: "text-gray-900 dark:text-white",
    },
    {
      label: "Active",
      value: filteredFields.filter((f) => f.computed_status === "Active")
        .length,
      color: "text-green-600 dark:text-green-400",
    },
    {
      label: "At risk",
      value: filteredFields.filter((f) => f.computed_status === "At Risk")
        .length,
      color: "text-orange-500 dark:text-orange-400",
    },
    {
      label: "Completed",
      value: filteredFields.filter((f) => f.computed_status === "Completed")
        .length,
      color: "text-gray-400 dark:text-gray-500",
    },
  ];

  const thCls =
    "text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide px-4 py-3 whitespace-nowrap";
  const tdCls = "px-4 py-3 align-middle";

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 transition-colors">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400 dark:text-gray-500">Loading...</p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-200">
      {fieldModal && (
        <FieldModal
          field={fieldModal.isNew ? null : fieldModal.field}
          onSave={
            fieldModal.isNew
              ? handleCreateField
              : (form) => handleUpdateField(fieldModal.field.id, form)
          }
          onClose={() => setFieldModal(null)}
          customers={customers}
          agents={agents}
          isAdmin={isAdmin}
        />
      )}
      {confirmDelete && (
        <ConfirmModal
          message={`This will permanently delete "${confirmDelete.label}". This cannot be undone.`}
          onConfirm={() =>
            confirmDelete.type === "field"
              ? handleDeleteField(confirmDelete.id)
              : handleDeleteUser(confirmDelete.id)
          }
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-green-600 rounded-lg flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064"
                  />
                </svg>
              </div>
              <span className="font-semibold text-gray-900 dark:text-white text-sm hidden sm:block">
                SmartSeason
              </span>
            </div>
            <nav className="flex gap-1">
              {[
                { id: "fields", label: isAdmin ? "Fields" : "My Fields" },
                ...(isAdmin ? [{ id: "users", label: "Users" }] : []),
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${tab === item.id ? "bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400" : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800"}`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <div className="hidden sm:block text-right pl-2 border-l border-gray-100 dark:border-gray-800 ml-1">
              <p className="text-xs font-medium text-gray-900 dark:text-white leading-tight">
                {user.email}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {user.role}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 border border-gray-200 dark:border-gray-700 hover:border-red-200 dark:hover:border-red-800 px-3 py-1.5 rounded-lg transition ml-1"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-5 py-8">
        {error && (
          <div className="mb-6 p-3.5 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50 rounded-xl flex items-center gap-2">
            <svg
              className="w-4 h-4 text-red-500 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-xs text-red-600 dark:text-red-400 flex-1">
              {error}
            </p>
            <button
              onClick={() => setError("")}
              className="text-red-400 hover:text-red-600"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}

        {/* ── Fields tab ── */}
        {tab === "fields" && (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {isCustomer
                    ? "My Fields"
                    : isAgent
                      ? "My Fields"
                      : "All Fields"}
                </h2>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
                  {isAdmin
                    ? "Monitor and manage all field data"
                    : isAgent
                      ? "Fields assigned to you"
                      : "Fields assigned to your account"}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {isAdmin && agentEmails.length > 0 && (
                  <select
                    className="text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
                    value={agentFilter}
                    onChange={(e) => setAgentFilter(e.target.value)}
                  >
                    <option value="all">All agents</option>
                    {agentEmails.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                )}
                {(isAdmin || isAgent) && (
                  <button
                    onClick={() => setFieldModal({ isNew: true })}
                    className="flex items-center gap-1.5 text-sm font-medium text-white bg-gradient-to-r from-teal-500 to-green-600 hover:from-teal-600 hover:to-green-700 px-4 py-2 rounded-xl transition shadow-md shadow-teal-500/20"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    Add field
                  </button>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {stats.map((s) => (
                <div
                  key={s.label}
                  className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4"
                >
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">
                    {s.label}
                  </p>
                  <p className={`text-2xl font-semibold ${s.color}`}>
                    {s.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                      <th className={thCls}>Field</th>
                      <th className={thCls}>Crop</th>
                      <th className={thCls}>Stage</th>
                      <th className={thCls}>Status</th>
                      <th className={thCls}>Last update</th>
                      {isAdmin && <th className={thCls}>Agent</th>}
                      {!isCustomer && <th className={thCls}>Customer</th>}
                      {(isAdmin || isAgent) && (
                        <th className={thCls} style={{ textAlign: "right" }}>
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFields.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="text-center py-16">
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-10 h-10 bg-gray-50 dark:bg-gray-800 rounded-xl flex items-center justify-center">
                              <svg
                                className="w-5 h-5 text-gray-300 dark:text-gray-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                                />
                              </svg>
                            </div>
                            <p className="text-sm text-gray-400 dark:text-gray-500">
                              No fields found
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredFields.map((field) => (
                        <tr
                          key={field.id}
                          className="border-t border-gray-50 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors"
                        >
                          <td
                            className={`${tdCls} font-medium text-gray-900 dark:text-white`}
                          >
                            {field.name}
                          </td>
                          <td
                            className={`${tdCls} text-gray-500 dark:text-gray-400`}
                          >
                            {field.crop_type}
                          </td>
                          <td className={tdCls}>
                            <span className="inline-flex text-xs px-2.5 py-1 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-100 dark:border-gray-700 whitespace-nowrap">
                              {field.current_stage}
                            </span>
                          </td>
                          <td className={tdCls}>
                            {statusBadge(field.computed_status)}
                          </td>
                          <td
                            className={`${tdCls} text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap`}
                          >
                            {formatTs(field.last_update)}
                          </td>
                          {isAdmin && (
                            <td
                              className={`${tdCls} text-xs text-gray-400 dark:text-gray-500`}
                            >
                              {field.agent_email || (
                                <span className="text-gray-300 dark:text-gray-600">
                                  —
                                </span>
                              )}
                            </td>
                          )}
                          {!isCustomer && (
                            <td
                              className={`${tdCls} text-xs text-gray-400 dark:text-gray-500`}
                            >
                              {field.customer_email || (
                                <span className="text-gray-300 dark:text-gray-600">
                                  —
                                </span>
                              )}
                            </td>
                          )}
                          {(isAdmin || isAgent) && (
                            <td
                              className={tdCls}
                              style={{ textAlign: "right" }}
                            >
                              <div className="inline-flex items-center gap-1">
                                <button
                                  onClick={() => setFieldModal({ field })}
                                  className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/30 rounded-lg transition"
                                  title="Edit"
                                >
                                  <svg
                                    className="w-3.5 h-3.5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                    />
                                  </svg>
                                </button>
                                {isAdmin && (
                                  <button
                                    onClick={() =>
                                      setConfirmDelete({
                                        type: "field",
                                        id: field.id,
                                        label: field.name,
                                      })
                                    }
                                    className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                                    title="Delete"
                                  >
                                    <svg
                                      className="w-3.5 h-3.5"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                      />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ── Users tab ── */}
        {tab === "users" && isAdmin && (
          <>
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Users
              </h2>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
                Manage roles and access
              </p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                      <th className={thCls}>User</th>
                      <th className={thCls}>Role</th>
                      <th className={thCls} style={{ textAlign: "right" }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr
                        key={u.id}
                        className="border-t border-gray-50 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors"
                      >
                        <td className={tdCls}>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-400 to-green-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                              {u.email[0].toUpperCase()}
                            </div>
                            <span className="text-gray-900 dark:text-white">
                              {u.email}
                            </span>
                          </div>
                        </td>
                        <td className={tdCls}>
                          <select
                            className="text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500 transition disabled:opacity-40 disabled:cursor-not-allowed"
                            defaultValue={u.role}
                            disabled={u.id === user.id}
                            onChange={(e) =>
                              handleUpdateRole(u.id, e.target.value)
                            }
                          >
                            <option>Customer</option>
                            <option>Field Agent</option>
                            <option>Admin</option>
                          </select>
                        </td>
                        <td className={tdCls} style={{ textAlign: "right" }}>
                          <button
                            onClick={() =>
                              setConfirmDelete({
                                type: "user",
                                id: u.id,
                                label: u.email,
                              })
                            }
                            disabled={u.id === user.id}
                            className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Delete user"
                          >
                            <svg
                              className="w-3.5 h-3.5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
