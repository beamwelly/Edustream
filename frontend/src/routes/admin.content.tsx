import { createFileRoute } from "@tanstack/react-router";
import { ContentLibraryPage } from "@/pages/admin/ContentLibraryPage";

export const Route = createFileRoute("/admin/content")({
  component: ContentLibraryPage,
});
