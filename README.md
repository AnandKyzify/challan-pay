# Challan Flow

Monorepo layout for the Challan Management System.

```
challan-flow/
├── frontend/   # React + TanStack Start (Vite)
└── backend/    # FastAPI + MongoDB
```

## Quick start

**1. Backend** (API on port 8000)

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python run.py
```

**2. Frontend** (UI on port 3000 — see `frontend/vite.config.ts`)

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

Sign in at http://localhost:3000/login (default `admin` / `admin123` after first backend boot).

**API URL (frontend):** set `VITE_API_BASE_URL` in `frontend/.env` (see `frontend/.env.example`). Use `/api` on the server with a reverse proxy so UI and API share one domain and CORS is not needed.

See `backend/README.md` and `frontend/README.md` for details.
