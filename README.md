# SmartSeason – Agricultural Field Management Platform

## 🌾 Overview

SmartSeason is a modern, real‑time agricultural field management system designed for farmers, field agents, and administrators. It enables seamless tracking of crop fields, planting dates, growth stages, and risk status, with role‑based access control and live updates via Server‑Sent Events (SSE).

Whether you're a **Customer** monitoring your fields, a **Field Agent** updating crop progress, or an **Admin** overseeing all operations, SmartSeason provides a clean, responsive dashboard with orange accents, sticky columns on desktop, clickable rows, and persistent user preferences.

## ✨ Key Highlights
- Containerized: the whole project runs inside Docker containers.
- Database: PostgreSQL is used as the primary datastore.
- Public exposure: hosting is done via Tailscale Funnel.

You can access the live version by clicking <a href="https://bit.ly/42sQ4EN" target="_blank" rel="noopener noreferrer">here</a>.

## ✨ Key Features

- **Role‑based access** – Admin, Field Agent, and Customer views with tailored permissions.
- **Real‑time updates** – Field changes, role updates, and user deletions sync instantly across all active sessions via SSE.
- **Full CRUD for fields** – Create, edit, delete, and view field details; auto‑record updates with notes.
- **Smart status calculation** – Fields become *At Risk* after 14 days without updates, *Completed* when harvested.
- **User management (Admin)** – Promote/demote users, delete accounts (auto‑unassigns fields/updates).
- **Search & filters** – Search by field name or customer email, filter by status, agent, or customer.
- **Persistent pagination** – “Rows per page” saved in localStorage.
- **Clickable rows** – Field agents/admins edit directly; customers view details in a clean modal.
- **Responsive sticky columns** – Field and Crop columns stay visible on large screens, scroll normally on mobile.
- **Dark/light theme** – Toggle between themes with smooth transitions.

## 🧱 Tech Stack

| Component       | Technology                          |
|----------------|-------------------------------------|
| Frontend       | React 18 + Vite, Tailwind CSS       |
| Backend        | Node.js, Express                    |
| Database       | PostgreSQL                          |
| Authentication | JWT, bcrypt                        |
| Real‑time      | Server‑Sent Events (SSE)           |
| Container      | Docker + Docker Compose             |

## 🚀 Getting Started with Docker

The entire application (frontend, backend, database) can be run with Docker Compose.

### Prerequisites

- Docker and Docker Compose installed
- Git
- A Tailscale account and tailnet with Funnel enabled for the host device.

### 1. Clone the repository

```bash
git clone https://github.com/your-username/smartseason.git
cd smartseason
```

### 2. Environment variables

Create a `.env` file in the root directory (or adjust `docker-compose.yml` accordingly):

```env
# Database
POSTGRES_USER=smartseason
POSTGRES_PASSWORD=securepassword
POSTGRES_DB=smartseason

# Backend
DATABASE_URL=postgresql://smartseason:securepassword@db:5432/smartseason
JWT_SECRET=your_jwt_secret_here

# Frontend (optional, if you need to override API URL)
VITE_API_URL=http://localhost:3000
```

> **Note**: The provided `docker-compose.yml` already includes these variables. Adjust the password and secret for production.

### 3. Build and run

```bash
docker-compose up --build
```

This will:

- Start a PostgreSQL container (port 5432)
- Build and start the Node.js backend (port 3000)
- Build and start the Vite React frontend (port 5173)

### 4. Access the application

- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend API: [http://localhost:3000](http://localhost:3000)

### 5. Create initial admin user (optional)

The system does not seed an admin by default. You can register a user via the signup page, then manually update their role in the database:

```sql
UPDATE users SET role = 'Admin' WHERE email = 'admin@example.com';
```

Or use the Admin panel after logging in as an existing admin.

## 🛠️ Manual Setup (without Docker)

If you prefer to run services natively:

### Backend

```bash
cd backend
npm install
cp .env.example .env   # fill in your DATABASE_URL and JWT_SECRET
npm run migrate         # run database migrations (if any)
npm start
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env   # set VITE_API_URL=http://localhost:3000
npm run dev
```

## 📦 Database Schema (Simplified)

- **users** – `id`, `email`, `role`, `password_hash`
- **fields** – `id`, `name`, `crop_type`, `planting_date`, `current_stage`, `agent_id`, `customer_id`
- **field_updates** – `id`, `field_id`, `agent_id`, `stage`, `notes`, `created_at`

## 👥 User Roles & Permissions

| Action                          | Admin | Field Agent | Customer |
|--------------------------------|-------|-------------|----------|
| View all fields                | ✅     | ❌ (own only) | ❌ (own only) |
| Create/edit own fields         | ✅     | ✅           | ❌        |
| Edit any field (Admin)         | ✅     | ❌           | ❌        |
| Delete any field               | ✅     | ❌           | ❌        |
| Manage users (roles, delete)   | ✅     | ❌           | ❌        |
| View field details (read‑only) | ✅     | ✅           | ✅        |

## 🔄 Real‑time Events

SmartSeason uses Server‑Sent Events to push live updates:

- `role-changed` – When an admin changes a user’s role, the affected user receives a new JWT and the UI refreshes without logging out.
- `refresh-fields` – Notifies all relevant users (admin, agent, customer) that the field list has changed.
- `refresh-users` – Notifies admins that the user list changed.
- `refresh-dropdowns` – Updates the customer/agent dropdowns in edit modals.

## 🧪 Testing

No automated tests are included in the current version, but you can manually test:

- Login with different roles.
- Create, edit, delete fields.
- Change user roles and observe live token refresh.
- Delete a user and verify their fields become unassigned.
- Switch between dark/light themes.
- Use pagination and filters.

## 🤝 Contributing

Contributions are welcome! Please follow standard GitHub flow: fork, branch, commit, push, and open a pull request.

## 📄 License

MIT © SmartSeason

## 🙏 Acknowledgements

- [Tailwind CSS](https://tailwindcss.com/)
- [Vite](https://vitejs.dev/)
- [React](https://reactjs.org/)
- [Express](https://expressjs.com/)
- [PostgreSQL](https://www.postgresql.org/)

---

**SmartSeason** – Smarter farming, one field at a time. 🌱
