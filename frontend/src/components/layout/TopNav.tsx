import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  LayoutDashboard,
  LogOut,
  Scale,
  ScrollText,
  ShieldCheck,
  Trash2,
  User as UserIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AddUserDialog } from "@/components/admin/AddUserDialog";
import { isAdminRole } from "@/services/authService";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Challan List", url: "/challans", icon: ScrollText },
  { title: "Sent in Court", url: "/challans/sent-in-court", icon: Scale },
  { title: "Deleted logs", url: "/deleted-logs", icon: Trash2 },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
];

export function TopNav() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    toast.success("Signed out");
    navigate({ to: "/login" });
  };

  const initials = (user?.name ?? "U")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 grid h-14 grid-cols-[1fr_auto_1fr] items-center gap-2 border-b bg-background/80 px-3 backdrop-blur md:px-5">
      <Link to="/dashboard" className="flex items-center gap-2 justify-self-start">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <ShieldCheck className="h-4 w-4" />
        </div>
        <span className="hidden text-sm font-semibold sm:inline">Challan CMS</span>
      </Link>

      <nav className="flex items-center justify-center gap-0.5 sm:gap-1">
        {navItems.map((item) => {
          const active =
            pathname === item.url ||
            (item.url !== "/challans" && pathname.startsWith(`${item.url}/`));
          return (
            <Link
              key={item.url}
              to={item.url}
              className={cn(
                "inline-flex items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium transition-colors sm:px-4",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="hidden md:inline">{item.title}</span>
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center justify-self-end gap-1.5">
        {isAdminRole(user?.role) && <AddUserDialog />}
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 px-2">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium sm:inline">{user?.name}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="leading-tight">
                <p className="text-sm font-medium">{user?.name}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <UserIcon className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
