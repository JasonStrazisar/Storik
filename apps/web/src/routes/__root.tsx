import { createRootRoute, Outlet } from "@tanstack/react-router"
import { useActiveProject } from "../features/projects/hooks/useProjectQueries"
import { ProjectOnboardingPage } from "../features/projects/pages/ProjectOnboardingPage"
import { ProjectSelector } from "../features/projects/components/ProjectSelector"

export const Route = createRootRoute({
  component: () => {
    const { data, isLoading } = useActiveProject()

    if (isLoading) {
      return <div data-testid="loading">Loading...</div>
    }

    if (data?.status === "onboarding-required") {
      return <ProjectOnboardingPage />
    }

    return (
      <div style={{ display: "flex" }}>
        <aside style={{ width: "200px", borderRight: "1px solid #ccc", padding: "1rem" }}>
          <ProjectSelector />
        </aside>
        <main style={{ flex: 1, padding: "1rem" }}>
          <Outlet />
        </main>
      </div>
    )
  },
})
