import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useAuthStore } from "@/store/auth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

function isTokenExpired(token: string | null): boolean {
  if (!token) return true;
  try {
    const base64 = token.split(".")[1];
    if (!base64) return true;
    const payload = JSON.parse(
      atob(base64.replace(/-/g, "+").replace(/_/g, "/")),
    ) as { exp?: number };
    if (typeof payload.exp !== "number") return false;
    return payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

export const Route = createFileRoute("/_app")({
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    const { isAuthenticated, token, logout } = useAuthStore.getState();
    if (!isAuthenticated || isTokenExpired(token)) {
      if (isAuthenticated) logout();
      throw redirect({ to: "/login" });
    }
  },
  component: () => (
    <DashboardLayout />
  ),
});

// Children render via DashboardLayout's <Outlet />. Expose Outlet for completeness.
export { Outlet };
