# Challan CMS — FastAPI backend

Async **FastAPI** + **Motor** (MongoDB). Database **`pan`** (configurable via `MONGODB_DB_NAME`).

## Collections

| Collection | Purpose |
|------------|---------|
| `challan_detail` | List + detail card: `challan_no`, `order_no`, `amount`, `time`, `rc_no`, `status`, optional `deleted` / `deleted_at` |
| `challan_status` | Status history: one document per step with `challan_no`, `status` or `message`, and `time` (sorted ascending). Legacy CMS rows may use a single doc with `timeline[]`. |
| `challan_deleted_logs` | Delete audit: who deleted what and when |
| `cms_users` | Users; first boot seeds admin from env |

List/detail APIs load steps with **`db.challan_status.find({ challan_no }).sort({ time: 1 })`** (also matches `challanNumber`). Joined to **`challan_detail`** by **`challan_no`**.

## Configuration

**Never commit real secrets.** Copy `backend/.env.example` to `backend/.env` and set:

- `MONGODB_URI` — e.g. Atlas or `mongodb://localhost:27017`
- `MONGODB_DB_NAME` — default `pan`
- `JWT_SECRET` — long random string in production
- `ADMIN_*` — only used when the users collection is empty (seed admin once)

See `.env.example` for the full list.

## Run locally

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python run.py
```

Base URL: `http://127.0.0.1:8000/api`

## API overview

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/login` | — | JWT login |
| GET | `/auth/me` | Bearer | Current user |
| GET | `/challans` | Bearer | Full list (optional `include_deleted`) |
| GET | `/challans/sent-in-court` | Bearer | Court status only (lighter) |
| GET | `/challans/{id}` | Bearer | View details (detail + status merge) |
| POST | `/challans` | Bearer | Create |
| PATCH | `/challans/{id}/timeline` | Bearer | Append timeline step |
| DELETE | `/challans/{id}` | Bearer | Hard delete from `challan_detail` + `challan_status`, audit log |
| POST | `/challans/bulk-delete` | Bearer | Body `{ "ids": [...] }` |
| GET | `/deleted-logs` | Bearer | Deleted challan audit |
| GET | `/dashboard` | Bearer | `mode=lifetime\|day\|range`, `from`, `to`, `day` |
| POST | `/users` | **Admin** | Create user (username + password; name defaults to username) |
| GET | `/users` | **Admin** | List users |

## Layout (MVC-style)

```
app/
  main.py              # FastAPI app, CORS, exception handlers
  config.py            # Pydantic Settings → env
  startup.py           # Indexes + admin seed
  api/v1/              # HTTP layer (thin routers)
    endpoints/         # One file per area: auth, challans, dashboard, …
  services/            # Business logic
  repositories/        # Async MongoDB access
  models/              # Pydantic request/response schemas
  core/                # JWT, password hashing, dependencies, HTTP errors
  db/                  # Motor client lifecycle
  utils/               # Status / timeline field mapping
```

## Frontend

From the repo root, the UI lives in `frontend/`. Copy `frontend/.env.example` to `frontend/.env`:

```env
VITE_API_BASE_URL=/api
```

Run `npm run dev` inside `frontend/` (UI on port 3000, with this API on port 8000).

Non-admin users receive **403** on `/users` routes; only **admin** can add users.
