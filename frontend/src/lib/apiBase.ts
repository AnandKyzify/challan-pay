/**
 * API base URL from `VITE_API_BASE_URL` in frontend/.env (see .env.example).
 *
 * - Relative path (e.g. `/api`): browser calls same origin → no CORS when UI and API
 *   share one domain (nginx/reverse proxy routes `/api` to FastAPI).
 * - Absolute URL (e.g. `https://api.example.com/api`): use when API is on another host;
 *   add that UI origin in backend `CORS_ORIGINS`.
 */
export function resolveApiBase(): string {
  const configured = import.meta.env.VITE_API_BASE_URL ?? "/api";
  if (/^https?:\/\//i.test(configured)) {
    return configured.replace(/\/$/, "");
  }
  const path = configured.startsWith("/") ? configured : `/${configured}`;
  if (typeof window !== "undefined") {
    return path;
  }
  const origin =
    import.meta.env.VITE_APP_ORIGIN ??
    import.meta.env.VITE_DEV_SERVER_ORIGIN ??
    "http://127.0.0.1:5173";
  return `${String(origin).replace(/\/$/, "")}${path}`;
}

export const isBrowser = typeof window !== "undefined";
