import { Outlet } from "@tanstack/react-router";
import { TopNav } from "./TopNav";

export function DashboardLayout() {
  return (
    <div className="flex min-h-screen w-full flex-col">
      <TopNav />
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
}
