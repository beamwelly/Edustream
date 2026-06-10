import { createFileRoute } from "@tanstack/react-router";
import { MeetingsPage } from "@/pages/admin/MeetingsPage";

export const Route = createFileRoute("/admin/meetings")({
  component: MeetingsPage,
});
