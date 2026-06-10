import { createFileRoute } from "@tanstack/react-router";
import { UserMasterclassesPage } from "@/pages/user/UserMasterclassesPage";

export const Route = createFileRoute("/user/masterclasses")({
  component: UserMasterclassesPage,
});
