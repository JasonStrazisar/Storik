import { createFileRoute } from "@tanstack/react-router"
import { HarnessDashboardPage } from "../features/harness/pages/HarnessDashboardPage"

export const Route = createFileRoute("/harness")({
  component: HarnessDashboardPage,
})
