import { useState } from "react";
import { Outlet, Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { AppBackground } from "@/components/background";
import { DashboardSidebar } from "@/components/sidebar/DashboardSidebar";
import { DashboardNavbar } from "@/components/navbar/DashboardNavbar";
import type { NavItem } from "@/components/common/types";
import { APP_LOGO, APP_NAME } from "@/constants/branding";

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="relative flex min-h-screen">
      <AppBackground />
      
      {/* Desktop Sidebar */}
      <DashboardSidebar roleLabel={roleLabel} nav={nav} footerNav={footerNav} />

      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" 
            onClick={() => setIsMobileMenuOpen(false)} 
          />
          <div className="relative flex w-64 max-w-xs flex-1 flex-col bg-card border-r border-border p-5 animate-in slide-in-from-left duration-200">
            <div className="absolute top-4 right-4">
              <button 
                onClick={() => setIsMobileMenuOpen(false)} 
                className="rounded-lg p-1.5 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="mb-6 px-2 flex items-center gap-3">
              <img src={APP_LOGO} alt={`${APP_NAME} Logo`} className="h-8 w-auto object-contain" />
              <div>
                <h1 className="text-base font-bold text-foreground">{APP_NAME}</h1>
                <p className="text-2xs text-muted-foreground capitalize">{roleLabel}</p>
              </div>
            </div>
            
            <nav className="flex-1 space-y-1">
              {nav.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                  >
                    <Icon className="h-4.5 w-4.5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      <div className="relative z-10 flex-1 md:ml-64 min-w-0">
        <div className="sticky top-0 z-20 flex items-center bg-background/80 backdrop-blur border-b border-border px-4 py-1.5 md:p-0 md:bg-transparent md:backdrop-filter-none md:border-none">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="md:hidden p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors mr-2"
          >
            <Menu className="h-5.5 w-5.5" />
          </button>
          <div className="flex-1">
            <DashboardNavbar roleLabel={roleLabel} userName={userName} />
          </div>
        </div>
        <main className="relative mx-auto w-full max-w-7xl px-4 py-6 md:px-6 md:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
