# MedStock

MedStock is a MERN application: a React/Vite frontend, a Node.js/Express REST API, and MongoDB. The administrator inventory screen is backed by the API; it does not contain hardcoded medicine rows.

## Requirements

- Node.js 20.19+ and npm
- For the shared database: access to the project’s MongoDB Atlas cluster
- For a local-only database instead: Docker Desktop or a local MongoDB instance

## Run with MongoDB Atlas

Use these steps when connecting to the team’s shared Atlas database. Ask the project owner for the Atlas cluster address and a database username/password through a private channel; do not put credentials in Git, chat, screenshots, or this README. Each developer must add their current public IP under **Atlas → Security → Network Access**. Prefer a specific IP instead of allowing access from everywhere.

1. From the repository root, install dependencies and create your local backend environment file:

   ```powershell
   npm install
   Copy-Item backend\.env.example backend\.env
   ```

   If `backend\.env` already exists, edit it instead of copying over it. This file is ignored by Git and must stay local.

2. In Atlas, open **Cluster → Connect → Drivers** and copy the connection string. In `backend\.env`, replace the `MONGODB_URI` value with that URI:

   Paste Atlas's complete URI after `MONGODB_URI=`. Use the real cluster hostname and database user, replace any password placeholder, and URL-encode special characters in the password. Make sure the URI selects `medstock` as the database name before any `?` options. Do not leave Atlas placeholders in the URI.

3. Configure the staff account used to sign in to the app. In the same file, set a private admin username and a strong `MEDSTOCK_ADMIN_PASSWORD`. These are application credentials, separate from the Atlas database credentials. Save the file.

4. Open a terminal at the repository root and start the API:

   ```powershell
   npm run dev:api
   ```

   Leave this terminal running. On successful startup it prints `MedStock API listening on port 8080`. It initializes the default categories and provisions configured staff accounts. Existing staff accounts are not overwritten on later starts. Set both pharmacist variables to provision a pharmacist account.

5. Open a second terminal at the repository root and start the frontend:

   ```powershell
   npm run dev:web
   ```

   Open the Vite URL (normally `http://localhost:5173`) and sign in with the app admin credentials from `backend\.env`. Vite proxies `/api` requests to the API at port 8080, so keep both terminal processes running.

6. To verify the API, open `http://localhost:8080/api/health`; it should return `{"status":"ok"}`. In MongoDB Compass, connect to the same Atlas cluster to view the `medstock` database. MongoDB creates it when the API initializes categories; medicine records appear after they are added through the app.

### Troubleshooting Atlas connections

- **`querySrv ECONNREFUSED`**: The Node process cannot resolve Atlas’s SRV DNS record. Check internet/VPN/network restrictions and retry on another network. If the network does not support SRV lookups, use the standard (non-SRV) connection string provided by Atlas, if available, and put that complete URI in `MONGODB_URI`.
- **Authentication failed**: Check that the URI uses the Atlas database user (not the Atlas website login), that its password is correct and URL-encoded, and that the user has database access.
- **IP not allowed**: Add the current public IP to Atlas Network Access. If the network changes, the IP may need updating.
- **Frontend reports it cannot connect to MedStock / `ECONNREFUSED` on port 8080**: Start or restart `npm run dev:api` and leave that terminal running while using the frontend.
- Never share or commit `backend\.env`. If credentials are exposed, rotate the database-user password and staff password.

## Run with local MongoDB (optional)

If you prefer a local database, start Docker Desktop and run this from the repository root:

```powershell
docker compose up -d mongodb
```

The sample `MONGODB_URI` in `backend\.env.example` matches the local Compose defaults. Those defaults are for local development only. MongoDB data is stored in the `medstock-mongodb-data` Docker volume. Configure strong credentials before using any shared or deployed environment.

Then follow steps 1 and 3–6 above, using the local URI from `backend\.env.example` instead of an Atlas URI.

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
