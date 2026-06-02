# Manufacturing Dashboard

A full-stack manufacturing business dashboard with role-based access control.

**Stack:** React (Vite) · Node.js/Express · PostgreSQL · Docker

---

## Prerequisites

You need two tools installed on your machine before anything else. Everything else (Node.js, PostgreSQL, Nginx) runs inside Docker — you do not need to install them separately.

### 1. Docker Desktop

Docker runs all three services (database, backend, frontend) in isolated containers.

- **Windows / macOS:** download and install from https://www.docker.com/products/docker-desktop
- **Linux (Ubuntu/Debian):**
  ```bash
  sudo apt update
  sudo apt install -y docker.io docker-compose-plugin
  sudo systemctl enable --now docker
  sudo usermod -aG docker $USER   # lets you run docker without sudo (log out and back in after)
  ```
- **Linux (Fedora/RHEL):**
  ```bash
  sudo dnf install -y docker docker-compose-plugin
  sudo systemctl enable --now docker
  sudo usermod -aG docker $USER
  ```

Verify it works:
```bash
docker --version        # e.g. Docker version 26.x.x
docker compose version  # e.g. Docker Compose version v2.x.x
```

> **Note:** make sure you have `docker compose` (v2, no hyphen), not the older `docker-compose` (v1). The commands in this README use v2 syntax.

### 2. unzip (to extract the archive)

- **Windows:** right-click the zip file → "Extract All", or use 7-Zip (https://www.7-zip.org)
- **macOS:** double-click the zip file in Finder, or run `unzip manufacturing-dashboard.zip` in Terminal (built-in)
- **Linux:**
  ```bash
  sudo apt install unzip   # Debian/Ubuntu
  sudo dnf install unzip   # Fedora/RHEL
  ```

---

## Quick start

```bash
# 1. Clone / download the project
cd manufacturing-dashboard

# 2. (Optional) copy and edit secrets
cp .env.example .env

# 3. Build and run all services
docker compose up --build
```

Open **http://localhost** in your browser.

| Account | Password  | Role  |
|---------|-----------|-------|
| admin   | admin123  | Admin |
| maria   | user123   | User  |

---

## Project structure

```
manufacturing-dashboard/
├── docker-compose.yml
├── .env.example
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── migrations/
│   │   └── 001_schema.sql      ← DB schema + seed data
│   └── src/
│       ├── index.js             ← Express app entry
│       ├── db/pool.js           ← PostgreSQL connection
│       ├── middleware/auth.js   ← JWT auth + admin guard
│       └── routes/
│           ├── auth.js          ← POST /api/auth/login
│           ├── parts.js         ← CRUD /api/parts
│           ├── products.js      ← CRUD /api/products (with BOM)
│           ├── clients.js       ← CRUD /api/clients
│           ├── sales.js         ← CRUD + status lifecycle /api/sales
│           ├── audit.js         ← GET /api/audit
│           └── users.js         ← CRUD /api/users
└── frontend/
    ├── Dockerfile               ← Multi-stage: Vite build → Nginx
    ├── nginx.conf               ← Proxies /api → backend, SPA fallback
    ├── vite.config.js
    └── src/
        ├── main.jsx
        ├── index.css
        ├── api/client.js        ← All API calls + JWT header
        ├── hooks/useAuth.jsx    ← Auth context
        ├── components/ui.jsx    ← Shared UI primitives
        └── pages/
            ├── Login.jsx
            ├── App.jsx          ← Shell + tab nav
            ├── Overview.jsx
            ├── Products.jsx
            ├── Parts.jsx
            ├── Sales.jsx
            ├── Clients.jsx
            ├── AuditLog.jsx
            └── Users.jsx
```

---

## API endpoints

| Method | Path                        | Auth     | Description                        |
|--------|-----------------------------|----------|------------------------------------|
| POST   | /api/auth/login             | public   | Login → JWT token                  |
| GET    | /api/parts                  | any      | List parts                         |
| POST   | /api/parts                  | admin    | Create part                        |
| PUT    | /api/parts/:id              | admin    | Update part                        |
| DELETE | /api/parts/:id              | admin    | Delete part                        |
| GET    | /api/products               | any      | List products with BOM             |
| POST   | /api/products               | admin    | Create product + BOM               |
| PUT    | /api/products/:id           | admin    | Update product + BOM               |
| DELETE | /api/products/:id           | admin    | Delete product                     |
| GET    | /api/clients                | any      | List clients                       |
| POST   | /api/clients                | any      | Create client                      |
| PUT    | /api/clients/:id            | any      | Update client                      |
| DELETE | /api/clients/:id            | admin    | Delete client                      |
| GET    | /api/sales                  | any      | List sales (joined)                |
| POST   | /api/sales                  | any      | Create sale (deducts stock if Paid)|
| PATCH  | /api/sales/:id/status       | any      | Change status (enforces lifecycle) |
| DELETE | /api/sales/:id              | admin    | Delete locked sale                 |
| GET    | /api/audit                  | any      | Audit log (filterable)             |
| GET    | /api/users                  | admin    | List users                         |
| POST   | /api/users                  | admin    | Create user                        |
| DELETE | /api/users/:id              | admin    | Remove user                        |

### Sale status transitions

```
Pending ──► Paid      (deducts parts from stock)
Pending ──► Aborted   (no stock change)
Paid    ──► Refunded  (restores parts to stock)
Aborted / Refunded  →  locked, no further changes
```

---

## Production checklist

- [ ] Change `JWT_SECRET` in docker-compose.yml or .env
- [ ] Change `POSTGRES_PASSWORD`
- [ ] Put Nginx behind a reverse proxy (Traefik, Caddy, etc.) with TLS
- [ ] Remove demo seed accounts or change passwords after first login
