import { createFileRoute } from "@tanstack/react-router";
import { AdminFeedbackPage } from "@/pages/admin/FeedbackPage";

export const Route = createFileRoute("/admin/feedback")({
  component: AdminFeedbackPage,
});
