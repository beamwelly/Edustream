import { createFileRoute } from "@tanstack/react-router";
import { UserProfilePage } from "@/pages/user/UserProfilePage";

export const Route = createFileRoute("/user/profile")({
  component: UserProfilePage,
});
