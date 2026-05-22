import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useAuthStore } from "@/store/auth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

export const Route = createFileRoute("/_app")({
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    if (!useAuthStore.getState().isAuthenticated) {
      throw redirect({ to: "/login" });
    }
  },
  component: () => (
    <DashboardLayout />
  ),
});

// Children render via DashboardLayout's <Outlet />. Expose Outlet for completeness.
export { Outlet };
