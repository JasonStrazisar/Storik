import { createRootRoute, Outlet } from "@tanstack/react-router"
import { useActiveProject } from "../features/projects/hooks/useProjectQueries"
import { ProjectOnboardingPage } from "../features/projects/pages/ProjectOnboardingPage"

export const Route = createRootRoute({
  component: () => {
    const { data, isLoading } = useActiveProject()

    if (isLoading) {
      return <div data-testid="loading">Loading...</div>
    }

    if (data?.status === "onboarding-required") {
      return <ProjectOnboardingPage />
    }

    return <Outlet />
  },
})
