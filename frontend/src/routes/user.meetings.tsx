import { createFileRoute } from "@tanstack/react-router";
import { UserMeetingsPage } from "@/pages/user/UserMeetingsPage";

export const Route = createFileRoute("/user/meetings")({
  component: UserMeetingsPage,
});
