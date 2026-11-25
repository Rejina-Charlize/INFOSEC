# MedStock

MedStock is a React/Vite frontend and Java 25/Spring Boot REST API backed by MongoDB. The administrator inventory screen loads medicine and stock data from the API.

See [database/ERD.md](database/ERD.md) for the MongoDB data model.

## Requirements

- Java 25
- Maven 3.9+
- Node.js 20.19+ and npm
- MongoDB 7.0+ (local service or MongoDB Atlas)

## Run locally

1. Start MongoDB. For a local Windows service, check it with:

   ```powershell
   Get-Service MongoDB
   ```

   The default connection is `mongodb://localhost:27017/medstock`. For MongoDB Atlas or an authenticated server, set `MONGODB_URI` to the connection URI for your database.

2. Start the backend with the local profile:

   ```powershell
   $env:SPRING_PROFILES_ACTIVE = "local"
   # Optional: use another MongoDB URI:
   # $env:MONGODB_URI = "mongodb://localhost:27017/medstock"
   mvn -f backend/pom.xml spring-boot:run
   ```

   The local profile provisions `admin@gmail.com` / `admin@123` and the `worker` / `worker-password` pharmacist demo account. It also adds four categories and five sample medicines with batches and stock movements. Demo data is inserted only when its SKU is missing and persists in MongoDB across restarts. These credentials and records are for local testing only; replace them before using a shared or production database.

   For a non-local environment, set `MONGODB_URI`, `MEDSTOCK_ADMIN_USERNAME`, and `MEDSTOCK_ADMIN_PASSWORD`. Demo inventory is disabled by default; set `MEDSTOCK_DEMO_DATA=true` only when sample inventory is wanted.

3. In a separate terminal, install frontend dependencies and start Vite from the repository root:

   ```powershell
   npm install
   npm run dev
   ```

   Open the Vite URL (normally `http://localhost:5173`). Vite proxies `/api` requests to Spring Boot at port 8080.

## Staff accounts

Sign in as an administrator and choose **Manage staff** in the sidebar to create pharmacist accounts for workers. Passwords are stored as BCrypt hashes. Only administrators can create staff accounts.

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
| POST | `/api/admin/accounts` | Create a pharmacist account (administrator only) |
| POST | `/api/medicines` | Create a medicine |
| PUT | `/api/medicines/{id}` | Update medicine details |
| DELETE | `/api/medicines/{id}` | Archive a medicine while preserving history (administrator only) |
| POST | `/api/medicines/{id}/adjustments` | Receive a dated batch or dispense stock using FEFO |

Inventory filters include `search`, `category`, `prescription=true|false`, `stock=low|healthy`, and `expiry=soon|expired|ok`. Page size is limited to 100.

## Project layout

- `frontend/` — React, Vite, Tailwind CSS, Axios, React Router, Lucide React, Recharts
- `backend/` — Spring Boot, Spring Security, Spring Data MongoDB, Bean Validation
- `database/ERD.md` — MongoDB collection model

The older PostgreSQL SQL files under `database/` are retained for reference only; the application no longer uses them.
