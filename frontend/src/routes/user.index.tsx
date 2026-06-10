import { createFileRoute } from "@tanstack/react-router";
import { UserDashboardPage } from "@/pages/user/UserDashboardPage";

export const Route = createFileRoute("/user/")({
  component: UserDashboardPage,
});
