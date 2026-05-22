import { api } from "./api";

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: { id: string; username: string; name: string; email: string; role: string };
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    return api.post<AuthResponse>("/auth/login", credentials);
  },

  async me(): Promise<AuthResponse["user"]> {
    return api.get<AuthResponse["user"]>("/auth/me");
  },
};

export function isAdminRole(role: string | undefined): boolean {
  const r = (role ?? "").toLowerCase();
  return r === "admin" || r === "administrator";
}
