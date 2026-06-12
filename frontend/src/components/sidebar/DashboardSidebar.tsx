import { Link, useRouterState } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import type { NavItem } from "@/components/common/types";
import { useAuth } from "@/context/AuthContext";
import { APP_LOGO, APP_NAME } from "@/constants/branding";

interface DashboardSidebarProps {
  roleLabel: string;
  nav: NavItem[];
  footerNav?: NavItem[];
}

export function DashboardSidebar({ roleLabel, nav, footerNav }: DashboardSidebarProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useAuth();

  return (
    <aside className="app-surface-sidebar fixed left-0 top-0 z-30 hidden h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar px-4 py-6 md:flex">
      <div className="mb-8 flex items-center gap-3 px-2 min-w-0 w-full">
        <img src={APP_LOGO} alt={`${APP_NAME} Logo`} className="h-10 w-auto object-contain flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-semibold text-foreground truncate">{APP_NAME}</h1>
          <p className="text-xs text-muted-foreground capitalize truncate">
            {user?.role ? (user.role === "admin" ? "Admin Dashboard" : "User Dashboard") : roleLabel}
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {nav.map((item) => {
          const active =
            pathname === item.to ||
            (item.to !== "/" && pathname.startsWith(item.to));
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors " +
                (active
                  ? "bg-primary-soft text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground")
              }
            >
              <Icon className="h-[18px] w-[18px]" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-1 border-t border-sidebar-border pt-4">
        {footerNav?.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors " +
                (active
                  ? "bg-primary-soft text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground")
              }
            >
              <Icon className="h-[18px] w-[18px]" />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <Link
          to="/"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-primary"
        >
          <LogOut className="h-[18px] w-[18px]" />
          <span>Logout</span>
        </Link>
      </div>
    </aside>
  );
}
