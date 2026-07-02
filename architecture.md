# Manufacturing Dashboard Architecture

## Summary

This project is a full-stack manufacturing business dashboard built with:

- Frontend: React + Vite
- Backend: Node.js + Express
- Database: PostgreSQL
- Deployment: Docker Compose with separate containers for frontend, backend, and database

The application provides:

- user authentication with JWT
- role-based access control (admin / user)
- inventory management for parts and products
- sales recording and lifecycle management
- customer management
- audit logging
- shipping label generation in PDF format
- bilingual UI support (English and Romanian)

---

## High-level Architecture

### Containers / Services

`docker-compose.yml` defines three services:

- `db`
  - PostgreSQL 16 database
  - initialized with SQL migrations under `backend/migrations`
  - data persisted in Docker volume `pgdata`
- `backend`
  - Node.js Express API
  - connects to PostgreSQL using env vars
  - runs migrations on startup
  - exposes API routes under `/api`
- `frontend`
  - React UI built with Vite
  - served through Nginx
  - proxies `/api` requests to the backend

### Deployment Flow

1. `docker compose up --build` builds backend and frontend images.
2. `db` starts and becomes healthy.
3. `backend` starts, runs SQL migrations, then listens on port `4000` internally.
4. `frontend` serves static assets on port `80` and forwards API calls to `backend`.

---

## Backend Architecture

### Entry point

`backend/src/index.js`

- configures Express app
- enables CORS and JSON parsing
- mounts route modules for auth, parts, products, clients, sales, label, settings, audit, and users
- health endpoint: `GET /api/health`
- global error handler
- starts app after running migrations

### Database connection

`backend/src/db/pool.js`

- uses `pg` module
- reads DB config from environment variables
- exports a shared connection pool

### Migrations

`backend/src/db/migrate.js`

- reads SQL files from `backend/migrations`
- executes them sequentially
- ignores duplicate/`already exists` errors so repeated startup is safe

### Authentication and Authorization

`backend/src/middleware/auth.js`

- extracts JWT from `Authorization: Bearer <token>` header
- verifies using `JWT_SECRET`
- attaches decoded user payload to `req.user`
- `adminOnly` middleware rejects non-admin roles

### Routes and features

#### `backend/src/routes/auth.js`

- `POST /api/auth/login`
- validates credentials against `users` table
- compares password with `bcryptjs`
- issues JWT containing user id, username, fullname, role
- logs login actions to audit

#### `backend/src/routes/parts.js`

- `GET /api/parts` - list parts
- `POST /api/parts` - create part (admin only)
- `PUT /api/parts/:id` - update part (admin only)
- `DELETE /api/parts/:id` - delete part (admin only)

#### `backend/src/routes/products.js`

- `GET /api/products` - list products and BOM items
- `POST /api/products` - create product and its BOM (admin only)
- `PUT /api/products/:id` - update product and BOM (admin only)
- `DELETE /api/products/:id` - delete product (admin only)

The product route persists BOM lines in `bom` table and enforces SKU uniqueness.

#### `backend/src/routes/clients.js`

- `GET /api/clients` - list clients
- `POST /api/clients` - create client
- `PUT /api/clients/:id` - update client
- `DELETE /api/clients/:id` - delete client (admin only)

Includes postal code validation and client audit logging.

#### `backend/src/routes/sales.js`

- `GET /api/sales` - list all sales with related item and client metadata
- `POST /api/sales` - create sale
- `PATCH /api/sales/:id/status` - change sale status
- `DELETE /api/sales/:id` - delete sale (admin only, blocked when stock deducted)

Sale lifecycle logic:

- `Pending` → `Paid`
  - validates stock for sale items
  - deducts stock from `products.qty`
  - sets `stock_deducted=true`
- `Pending` → `Aborted`
  - does not change stock
- `Paid` → `Refunded`
  - restores stock for sale items
  - sets `stock_deducted=false`
- `Aborted` / `Refunded`
  - become locked and cannot move further

The route uses transactions and stock validation for safe updates.

#### `backend/src/routes/label.js`

- `GET /api/label/sales/:id/label`
- loads sale, related client, sale items, and company settings
- generates PDF shipping label via `backend/src/label.js`
- `label.js` calls `python3 generate_label.py` with `reportlab`
- returns generated PDF as `application/pdf`

#### `backend/src/routes/settings.js`

- `GET /api/settings` - fetch settings object
- `PUT /api/settings` - update allowed settings (admin only)
- stores company/shipping data in `settings` table

#### `backend/src/routes/audit.js`

- `GET /api/audit` - fetch latest audit log entries
- optional `?action=` filter
- logs are inserted by route handlers via `logAudit`

#### `backend/src/routes/users.js`

- `GET /api/users` - list users (admin only)
- `POST /api/users` - create user (admin only)
- `DELETE /api/users/:id` - delete user (admin only, cannot delete self)

### Label generation

`backend/src/label.js`

- runs `python3 generate_label.py` using `child_process.spawnSync`
- ensures `reportlab` is installed in backend image
- reads generated PDF from temp file and sends it in the API response

`backend/generate_label.py`

- builds an A6 PDF shipping label
- supports translation keys for English and Romanian
- renders sender, recipient, and item fields

### Backend Dockerfile

- based on `node:20-alpine`
- installs `python3` and `py3-pip`
- installs Node dependencies and `reportlab`
- copies backend source and runs `node src/index.js`

---

## Database Schema

### Tables

- `users`
  - stores login credentials, full name, role, and timestamps
- `parts`
  - inventory of raw components
  - fields: `qty`, `min_stock`, `unit_cost`
- `products`
  - finished products with sale price and stock quantity
- `bom`
  - bill of materials linking products to parts and required qty
- `clients`
  - customer records, contact info, address, postcode
- `sales`
  - high-level sale record with status, stock deduction state, product, client, and price
- `sale_items`
  - detailed items for each sale (multi-product support)
- `settings`
  - key/value store for company/shipping data
- `audit_log`
  - records user actions for auditing

### Migration files

- `001_schema.sql` — base schema + seed users, parts, products, clients
- `002_settings.sql` — add company settings table and defaults
- `003_clients_postcode.sql` — add `postcode` field to clients
- `004_product_qty.sql` — add manual product stock quantity
- `005_sale_items.sql` — add `sale_items` table for sale item details

---

## Frontend Architecture

### Entry point

`frontend/src/main.jsx`

- renders React app
- wraps UI with `AuthProvider` and `LanguageProvider`
- selects `App` or `Login` based on auth state

### API layer

`frontend/src/api/client.js`

- centralizes HTTP requests to `/api`
- adds `Authorization: Bearer <token>` header
- handles `401` by clearing local storage and reloading
- exposes methods for auth, parts, products, clients, sales, audit, settings, users, and labels

### Authentication state

`frontend/src/hooks/useAuth.jsx`

- stores `user` and login/logout actions
- persists token and user object to `localStorage`
- exposes `isAdmin` based on user role

### Language support

`frontend/src/hooks/useLanguage.jsx`

- stores language preference
- provides translation strings in English (`en`) and Romanian (`ro`)
- UI text keys are used widely across pages

### UI components

`frontend/src/components/ui.jsx`

- reusable components: `Modal`, `Card`, `Badge`, `Btn`, `Field`, `Spinner`, `ErrorMsg`
- helpers for stock badges, sale badges, formatted currency, confirmation dialogues

### Main app shell

`frontend/src/pages/App.jsx`

- renders top bar with language switch and user info
- renders tab navigation for pages
- admin-only pages: `Users`, `Settings`
- common pages: `Overview`, `Products`, `Parts`, `Sales`, `Clients`, `AuditLog`

### Key pages

- `Login.jsx` — login form and demo credentials display
- `Overview.jsx` — dashboard metrics, low-stock alerts, recent sales snapshot
- `Products.jsx` — product list, BOM management, stock cost calculation, admin CRUD
- `Parts.jsx` — parts inventory list and admin CRUD
- `Sales.jsx` — sale recording, status lifecycle, label printing, refunds
- `Clients.jsx` — client management, purchase history, totals
- `AuditLog.jsx` — audit trail view
- `Users.jsx` — admin user management
- `Settings.jsx` — company/shipping settings and label preview

### Frontend build and server

- `frontend/Dockerfile` builds the app with Vite
- Nginx serves production files
- `frontend/nginx.conf` proxies `/api` to `http://backend:4000`
- Vite dev server can also proxy `/api` during local development via `vite.config.js`

---

## Data flow and behavior

### Authentication

1. User submits username/password at `/login`.
2. Frontend calls `POST /api/auth/login`.
3. Backend validates credentials and returns JWT + user info.
4. Frontend stores token in `localStorage` and renders `App`.
5. Subsequent API calls carry the token in `Authorization` header.

### Sales and stock handling

- Sales are created through `POST /api/sales`.
- When a sale is created as `Paid`, backend verifies stock and deducts product quantity.
- Sale status updates are enforced with allowed transitions.
- On refund, stock is restored if it was previously deducted.
- Locked sales cannot be modified further.

### Product / BOM relationship

- Products are stored in `products`.
- Each BOM row in `bom` maps a product to a part and quantity required.
- Product pages calculate BOM cost and display assembled item details.

### Labels

- `GET /api/label/sales/:id/label` returns a PDF shipping label.
- Label generation uses `python3` with `reportlab` inside the backend container.
- Company settings are used to populate sender address fields.

---

## Notes

- The backend applies migrations on startup, so `backend/migrations` is the single source of DB schema evolution.
- Admin-only operations are protected both in backend middleware and by UI visibility.
- The frontend is a single-page app with client-side tab navigation instead of route-based routing.
- The PostgreSQL service is not exposed outside Docker except via frontend and backend network.

---

## How to run

From project root:

```bash
docker compose up --build
```

Then open `http://localhost`.

Default seeded accounts:

- `admin` / `admin123` (Admin)
- `maria` / `user123` (User)

---

## File and module map

### Backend

- `backend/src/index.js` — server startup and route mounting
- `backend/src/db/pool.js` — PostgreSQL pool
- `backend/src/db/migrate.js` — SQL migration runner
- `backend/src/middleware/auth.js` — JWT auth and admin guard
- `backend/src/routes/*.js` — REST API route handlers
- `backend/src/label.js` — PDF label generator wrapper
- `backend/generate_label.py` — Python label template

### Frontend

- `frontend/src/main.jsx` — React root
- `frontend/src/api/client.js` — API client
- `frontend/src/hooks/useAuth.jsx` — auth provider
- `frontend/src/hooks/useLanguage.jsx` — translations and language provider
- `frontend/src/components/ui.jsx` — shared UI primitives
- `frontend/src/pages/*.jsx` — dashboard pages

---

## Recommended improvements

- add input validation on frontend for all forms
- separate sale item creation into a dedicated multi-item UI
- move label generation entirely to Node.js or a native JS PDF library for fewer dependencies
- add unit/integration tests for backend and frontend
- restrict backend CORS to frontend host in production
