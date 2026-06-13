import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Library,
  GraduationCap,
  Wrench,
  CalendarClock,
  Loader2,
  MessageSquare,
  User,
} from "lucide-react";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { useAuth } from "@/context/AuthContext";

export const Route = createFileRoute("/admin")({
  component: Layout,
});

function Layout() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        navigate({ to: "/login" });
      } else if (user.role !== "admin") {
        navigate({ to: "/user" });
      }
    }
  }, [user, isLoading, navigate]);

  if (isLoading || !user || user.role !== "admin") {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FFF7F7]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <DashboardLayout
      roleLabel="Admin"
      userName={user?.full_name || "Admin"}
      nav={[
        { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
        { to: "/admin/users", label: "User Management", icon: Users },
        { to: "/admin/content", label: "Content Library", icon: Library },
        { to: "/admin/masterclasses", label: "Masterclasses", icon: GraduationCap },
        { to: "/admin/tools", label: "Tools", icon: Wrench },
        { to: "/admin/meetings", label: "Meetings", icon: CalendarClock },
        { to: "/admin/feedback", label: "Feedback", icon: MessageSquare },
        { to: "/admin/profile", label: "Profile", icon: User },
      ]}
    />
  );
}

