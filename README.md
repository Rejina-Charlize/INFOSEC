# MedStock

MedStock is a MERN application: a React/Vite frontend, a Node.js/Express REST API, and MongoDB. The administrator inventory screen is backed by the API; it does not contain hardcoded medicine rows.

## Requirements

- Node.js 20.19+ and npm
- Docker Desktop (or a local MongoDB instance)

## Run locally

1. Start MongoDB:

   ```powershell
   docker compose up -d mongodb
   ```

   The compose defaults are for local development. Set `MONGO_ROOT_USERNAME` and `MONGO_ROOT_PASSWORD` in the root `.env` before using a shared or deployed environment. MongoDB data is stored in the `medstock-mongodb-data` Docker volume.

2. Install the project dependencies and configure the API. Copy `backend/.env.example` to `backend/.env`, then set strong local staff passwords. The sample MongoDB URI matches the local Docker Compose defaults.

   ```powershell
   npm install
   Copy-Item backend/.env.example backend/.env
   # Edit backend/.env with a strong MEDSTOCK_ADMIN_PASSWORD first.
   npm run dev:api
   ```

   On startup, the API creates the default categories and provisions configured staff accounts with BCrypt-hashed passwords. Set both pharmacist variables to provision that role. Existing staff accounts are not overwritten on later starts.

3. In a separate terminal, install frontend dependencies and start Vite:

   ```powershell
   npm run dev:web
   ```

   Open the Vite URL (normally `http://localhost:5173`). Vite proxies `/api` requests to Express at port 8080.

## API

All responses are JSON. Public read endpoints:

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Liveness check |
| GET | `/api/medicines?page=0&size=8` | Searchable, filtered, paginated inventory |
| GET | `/api/medicines/{id}` | Medicine, eligible stock, batches, and movement log |
| GET | `/api/categories` | Active categories |
| GET | `/api/dashboard/summary` | Inventory statistics calculated from MongoDB |

Staff endpoints use HTTP Basic authentication and require the configured administrator or a pharmacist account:

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/auth/me` | Verify staff credentials |
| POST | `/api/medicines` | Create a medicine |
| PUT | `/api/medicines/{id}` | Update medicine details |
| DELETE | `/api/medicines/{id}` | Archive a medicine while preserving history (administrator only) |
| POST | `/api/medicines/{id}/adjustments` | Receive a dated batch or dispense stock using FEFO |

Inventory filters include `search`, `category`, `prescription=true|false`, `stock=low|healthy`, and `expiry=soon|expired|ok`. Page size is limited to 100. Prices, stock, and batches are validated by the server. Stock batches and their movement history are embedded in each medicine document; optimistic concurrency prevents concurrent stock adjustments from silently overwriting one another.

HTTP Basic credentials are appropriate for local development only. Deploy behind HTTPS and use strong, unique staff passwords.

## Current scope

The connected, working vertical slice covers inventory listing and detail data, database-derived dashboard metrics, medicine create/update/archive, batch receiving, FEFO dispensing, auditable stock movements, pagination, filters, CSV export, BCrypt-protected staff writes, and responsive React UI. Storefront, order, supplier, purchase, and prescription features are not yet exposed as completed modules.

No sample medicine or sales records are inserted. Add actual inventory through the staff interface or API. Categories are initialized as lookup values only.

## Project layout

- `frontend/` — React, Vite, Tailwind CSS, Axios, React Router, Lucide React, Recharts
- `backend/` — Node.js, Express, Mongoose, BCrypt staff authentication, and API tests
- `docker-compose.yml` — local MongoDB service and persistent volume
- `package.json` — all project dependencies and root-level development, test, build, and lint commands
