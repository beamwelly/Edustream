import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Library,
  GraduationCap,
  Wrench,
  CalendarClock,
  User,
  Loader2,
  MessageSquare,
} from "lucide-react";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { useAuth } from "@/context/AuthContext";

export const Route = createFileRoute("/user")({
  component: Layout,
});

function Layout() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        navigate({ to: "/login" });
      } else if (user.role !== "user" && user.role !== "owner" && user.role !== "employee") {
        navigate({ to: "/admin" });
      }
    }
  }, [user, isLoading, navigate]);

  if (isLoading || !user || (user.role !== "user" && user.role !== "owner" && user.role !== "employee")) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FFF7F7]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const navItems = [
    { to: "/user", label: "Dashboard", icon: LayoutDashboard, permission: "access_dashboard" },
    { to: "/user/content", label: "Content Library", icon: Library, permission: "access_content" },
    { to: "/user/masterclasses", label: "Masterclasses", icon: GraduationCap, permission: "access_masterclasses" },
    { to: "/user/tools", label: "Tools", icon: Wrench, isTools: true },
    { to: "/user/meetings", label: "Meetings", icon: CalendarClock, permission: "access_meetings" },
    { to: "/user/feedback", label: "Feedback", icon: MessageSquare, permission: "access_feedback" },
    { to: "/user/profile", label: "Profile", icon: User },
  ];

  const filteredNav = navItems.filter(item => {
    if (user.role !== "employee") return true;
    if (item.permission) {
      return !!(user.permissions as any)?.[item.permission];
    }
    if (item.isTools) {
      return (user.permissions?.allowed_tools || []).length > 0;
    }
    return true;
  });

  return (
    <DashboardLayout
      roleLabel={user.role === "owner" ? "Owner" : user.role === "employee" ? "Employee" : "User"}
      userName={user?.full_name || "User"}
      nav={filteredNav}
    />
  );
}

