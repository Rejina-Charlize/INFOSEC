# MedStock

MedStock is organized as a React/Vite frontend, a Java 25/Spring Boot REST API, and a PostgreSQL database. The administrator inventory screen is backed by the API; it does not contain hardcoded medicine rows.

## Requirements

- Java 25
- Maven 3.9+
- Node.js 20.19+ and npm
- Docker Desktop (or a local PostgreSQL 16+ instance)

## Run locally

1. Start PostgreSQL:

   ```powershell
   docker compose up -d postgres
   ```

   The database schema, indexes, and category records are initialized from `database/` on the first start. The compose defaults are for local development; change the database password before using a shared or deployed environment.

2. Set backend credentials and run Spring Boot. In PowerShell:

   ```powershell
   $env:DB_URL = "jdbc:postgresql://localhost:5432/medstock"
   $env:DB_USERNAME = "medstock"
   $env:DB_PASSWORD = "medstock"
   $env:MEDSTOCK_ADMIN_USERNAME = "admin"
   $env:MEDSTOCK_ADMIN_PASSWORD = "replace-with-a-strong-local-password"
   # Optional pharmacist account for stock and dispensing operations:
   $env:MEDSTOCK_PHARMACIST_USERNAME = "pharmacist"
   $env:MEDSTOCK_PHARMACIST_PASSWORD = "replace-with-another-strong-password"
   mvn -f backend/pom.xml spring-boot:run
   ```

   The first launch provisions configured staff accounts in PostgreSQL with BCrypt-hashed passwords. Set both pharmacist variables to provision that role. Do not use the example password outside local development.

3. In a separate terminal, install frontend dependencies and start Vite:

   ```powershell
   cd frontend
   npm install
   npm run dev
   ```

   Open the Vite URL (normally `http://localhost:5173`). Vite proxies `/api` requests to Spring Boot at port 8080.

## API

All responses are JSON. Public read endpoints:

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Liveness check |
| GET | `/api/medicines?page=0&size=8` | Searchable, filtered, paginated inventory |
| GET | `/api/medicines/{id}` | Medicine, eligible stock, batches, and movement log |
| GET | `/api/categories` | Active categories |
| GET | `/api/dashboard/summary` | Inventory statistics calculated from PostgreSQL |

Staff endpoints use HTTP Basic authentication and require the configured administrator or a pharmacist account:

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/auth/me` | Verify staff credentials |
| POST | `/api/medicines` | Create a medicine |
| PUT | `/api/medicines/{id}` | Update medicine details |
| DELETE | `/api/medicines/{id}` | Archive a medicine while preserving history (administrator only) |
| POST | `/api/medicines/{id}/adjustments` | Receive a dated batch or dispense stock using FEFO |

Inventory filters include `search`, `category`, `prescription=true|false`, `stock=low|healthy`, and `expiry=soon|expired|ok`. Page size is limited to 100. Prices, stock, and batches are validated by the server.

## Current scope

The connected, working vertical slice covers inventory listing and detail data, database-derived dashboard metrics, medicine create/update/archive, batch receiving, FEFO dispensing, auditable stock movements, pagination, filters, CSV export, BCrypt-protected staff writes, and responsive React UI. The SQL schema reserves the related tables for the remaining storefront, order, supplier, purchase, and prescription phases; those modules are not yet exposed as completed features.

No sample medicine or sales records are inserted. Add actual inventory through the staff interface or API. Categories are initialized as lookup values only.

## Project layout

- `frontend/` — React, Vite, Tailwind CSS, Axios, React Router, Lucide React, Recharts
- `backend/` — Spring Boot, Spring Security, Spring Data JPA, Bean Validation
- `database/` — PostgreSQL schema, lookup seed data, and indexes
