import { createFileRoute } from "@tanstack/react-router";
import { FeedbackPage } from "@/pages/user/FeedbackPage";

export const Route = createFileRoute("/user/feedback")({
  component: FeedbackPage,
});
