# Challan Flow — Frontend

React admin UI (TanStack Start + Vite). Talks to the API under `backend/`.

## Setup

```bash
cd frontend
npm install
copy .env.example .env
```

Copy `.env.example` to `.env` (and for production builds, see `.env.production.example`).

| Variable | Purpose |
|----------|---------|
| `VITE_API_BASE_URL` | API base — set in **frontend/.env** |
| `VITE_APP_ORIGIN` | Public site URL for SSR (production only) |

**Where it is used in code:** `src/lib/apiBase.ts` (`resolveApiBase`) → `src/services/api.ts` (`fetch`).

**Avoid CORS on the server:** use `VITE_API_BASE_URL=/api` and serve UI + API on the **same domain** (e.g. nginx: `/` → frontend, `/api` → `http://127.0.0.1:8000`). The browser then calls `/api/...` on the same origin.

**Different API host:** set `VITE_API_BASE_URL=https://api.yourdomain.com/api` and add your UI origin to `CORS_ORIGINS` in **backend/.env**.

In dev, Vite proxies `/api` to `http://127.0.0.1:8000` (see `vite.config.ts`).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server (http://localhost:5173) |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
