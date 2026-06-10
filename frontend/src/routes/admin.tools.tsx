import { createFileRoute } from "@tanstack/react-router";
import { ToolsPage } from "@/pages/admin/ToolsPage";

export const Route = createFileRoute("/admin/tools")({
  component: ToolsPage,
});
