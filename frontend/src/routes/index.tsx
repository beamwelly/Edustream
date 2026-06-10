import { createFileRoute } from "@tanstack/react-router";
import { APP_NAME, APP_TITLE } from "@/constants/branding";
import { LandingPage } from "@/pages/auth/LandingPage";

export const Route = createFileRoute("/")({
  component: LandingPage,
  head: () => ({
    meta: [
      { title: APP_TITLE },
      {
        name: "description",
        content:
          `${APP_NAME} — a calm, modern learning management and content sharing platform.`,
      },
    ],
  }),
});
