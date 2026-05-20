import { createFileRoute } from "@tanstack/react-router";
import { ProviderDashboard } from "@/components/provider/provider-dashboard";

export const Route = createFileRoute("/provider")({
  component: ProviderDashboard,
});