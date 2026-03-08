import { createRootRoute, Outlet } from "@tanstack/react-router"
import { useState } from "react"
import { useActiveProject } from "../features/projects/hooks/useProjectQueries"
import { ProjectOnboardingPage } from "../features/projects/pages/ProjectOnboardingPage"
import { ProjectSelector } from "../features/projects/components/ProjectSelector"
import { useHarnessGateStatus } from "../features/harness/hooks/useHarnessQueries"
import { useSetHarnessGateOverride } from "../features/harness/hooks/useHarnessMutations"
import { HarnessSoftGateBanner } from "../features/harness/components/HarnessSoftGateBanner"
import { HarnessOverrideModal } from "../features/harness/components/HarnessOverrideModal"

export const Route = createRootRoute({
  component: () => {
    const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false)
    const { data, isLoading } = useActiveProject()
    const activeProjectId = data?.status === "active" ? data.project.id : null
    const gateStatus = useHarnessGateStatus(activeProjectId ? { projectId: activeProjectId } : null)
    const setOverrideMutation = useSetHarnessGateOverride()

    const handleOverride = (reason: string) => {
      if (!activeProjectId) return
      setOverrideMutation.mutate(
        { projectId: activeProjectId, reason },
        {
          onSuccess: () => {
            setIsOverrideModalOpen(false)
          },
        }
      )
    }

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
          <HarnessSoftGateBanner
            requiresOverride={!!gateStatus.data?.requiresOverride}
            overriddenAt={gateStatus.data?.overriddenAt ?? null}
            onOverrideClick={() => setIsOverrideModalOpen(true)}
          />
          <Outlet />
          <HarnessOverrideModal
            open={isOverrideModalOpen}
            isPending={setOverrideMutation.isPending}
            onClose={() => setIsOverrideModalOpen(false)}
            onSubmit={handleOverride}
          />
        </main>
      </div>
    )
  },
})
