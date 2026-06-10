import { createFileRoute } from "@tanstack/react-router";
import { UserToolsPage } from "@/pages/user/UserToolsPage";

export const Route = createFileRoute("/user/tools")({
  component: UserToolsPage,
});
