import { Outlet } from "@tanstack/react-router";
import { AppBackground } from "@/components/background";
import { DashboardSidebar } from "@/components/sidebar/DashboardSidebar";
import { DashboardNavbar } from "@/components/navbar/DashboardNavbar";
import type { NavItem } from "@/components/common/types";

export type { NavItem };

interface DashboardLayoutProps {
  roleLabel: string;
  userName: string;
  nav: NavItem[];
  footerNav?: NavItem[];
}

export function DashboardLayout({
  roleLabel,
  userName,
  nav,
  footerNav,
}: DashboardLayoutProps) {
  return (
    <div className="relative flex min-h-screen">
      <AppBackground />
      <DashboardSidebar roleLabel={roleLabel} nav={nav} footerNav={footerNav} />
      <div className="relative z-10 flex-1 md:ml-64">
        <DashboardNavbar roleLabel={roleLabel} userName={userName} />
        <main className="relative mx-auto w-full max-w-7xl px-6 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
