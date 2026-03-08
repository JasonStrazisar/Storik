import { createFileRoute } from "@tanstack/react-router"
import { ArchivedProjectsPage } from "../../features/projects/pages/ArchivedProjectsPage"

export const Route = createFileRoute("/projects/archived")({
  component: ArchivedProjectsPage,
})
