import { createFileRoute } from "@tanstack/react-router";
import { UserContentPage } from "@/pages/user/UserContentPage";

export const Route = createFileRoute("/user/content")({
  component: UserContentPage,
});
