import { createFileRoute, redirect } from "@tanstack/react-router";
import { useAuthStore } from "@/store/auth";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    if (typeof window !== "undefined") {
      const authed = useAuthStore.getState().isAuthenticated;
      throw redirect({ to: authed ? "/dashboard" : "/login" });
    }
    throw redirect({ to: "/login" });
  },
});
