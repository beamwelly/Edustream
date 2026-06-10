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
      } else if (user.role !== "user") {
        navigate({ to: "/admin" });
      }
    }
  }, [user, isLoading, navigate]);

  if (isLoading || !user || user.role !== "user") {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FFF7F7]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <DashboardLayout
      roleLabel="User"
      userName={user?.full_name || "User"}
      nav={[
        { to: "/user", label: "Dashboard", icon: LayoutDashboard },
        { to: "/user/content", label: "Content Library", icon: Library },
        { to: "/user/masterclasses", label: "Masterclasses", icon: GraduationCap },
        { to: "/user/tools", label: "Tools", icon: Wrench },
        { to: "/user/meetings", label: "Meetings", icon: CalendarClock },
        { to: "/user/feedback", label: "Feedback", icon: MessageSquare },
        { to: "/user/profile", label: "Profile", icon: User },
      ]}
    />
  );
}

