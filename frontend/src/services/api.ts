import { resolveApiBase } from "@/lib/apiBase";
import { useAuthStore } from "@/store/auth";

const BASE_URL = resolveApiBase();

export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

interface RequestOptions extends RequestInit {
  retry?: number;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { retry = 1, headers, ...rest } = opts;
  const token = useAuthStore.getState().token;

  const finalHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(headers as Record<string, string>),
  };

  let attempt = 0;
  let lastError: unknown;
  while (attempt <= retry) {
    try {
      const res = await fetch(`${BASE_URL}${path}`, { ...rest, headers: finalHeaders });
      if (res.status === 401) {
        useAuthStore.getState().logout();
        throw new ApiError("Unauthorized", 401);
      }
      if (res.status === 204) return undefined as T;
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          (json as { message?: string })?.message ??
          (typeof (json as { detail?: unknown })?.detail === "string"
            ? (json as { detail: string }).detail
            : "Request failed");
        throw new ApiError(msg, res.status, json);
      }
      return json as T;
    } catch (e) {
      lastError = e;
      attempt += 1;
      if (attempt > retry) break;
      await new Promise((r) => setTimeout(r, 400 * attempt));
    }
  }
  if (lastError instanceof ApiError) throw lastError;
  if (lastError instanceof TypeError) {
    throw new ApiError(
      "Cannot reach the API. Start the backend (cd backend && python run.py) and check VITE_API_BASE_URL.",
      0,
    );
  }
  throw lastError;
}

export function getApiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Request failed";
}

export const api = {
  get: <T>(path: string, opts?: RequestOptions) => request<T>(path, { ...opts, method: "GET" }),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: "POST", body: JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: "PATCH", body: JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: "PUT", body: JSON.stringify(body) }),
  delete: <T>(path: string, opts?: RequestOptions) => request<T>(path, { ...opts, method: "DELETE" }),
};
