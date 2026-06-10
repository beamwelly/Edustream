import { createFileRoute } from "@tanstack/react-router";
import { MasterclassesPage } from "@/pages/admin/MasterclassesPage";

export const Route = createFileRoute("/admin/masterclasses")({
  component: MasterclassesPage,
});
