import { useMemo } from "react"
import { Button } from "../../../components/ui/Button"
import { useActiveProject } from "../../projects/hooks/useProjectQueries"
import { useHarnessAuditHistory } from "../hooks/useHarnessQueries"
import { useRunHarnessAudit } from "../hooks/useHarnessMutations"

export function HarnessDashboardPage() {
  const { data: activeProject } = useActiveProject()
  const projectId = activeProject?.status === "active" ? activeProject.project.id : null
  const auditHistory = useHarnessAuditHistory(projectId ? { projectId } : null)
  const runAuditMutation = useRunHarnessAudit()

  const latestAudit = useMemo(() => auditHistory.data?.[0] ?? null, [auditHistory.data])

  if (!projectId) {
    return <div data-testid="harness-no-project">No active project selected.</div>
  }

  const runAudit = () => {
    runAuditMutation.mutate({ projectId })
  }

  return (
    <section data-testid="harness-dashboard" className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Harness Dashboard</h2>
          <p className="text-sm text-gray-600">Audit context, skills and tools/MCP readiness.</p>
        </div>
        <Button type="button" onClick={runAudit} disabled={runAuditMutation.isPending} data-testid="run-harness-audit">
          {runAuditMutation.isPending ? "Running..." : "Run audit"}
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M5 18.5C5 18.9644 5 19.1966 5.02567 19.3916C5.2029 20.7378 6.26222 21.7971 7.60842 21.9743C7.80337 22 8.03558 22 8.5 22H16.2C17.8802 22 18.7202 22 19.362 21.673C19.9265 21.3854 20.3854 20.9265 20.673 20.362C21 19.7202 21 18.8802 21 17.2V9.98822C21 9.25445 21 8.88757 20.9171 8.5423C20.8436 8.2362 20.7224 7.94356 20.5579 7.67515C20.3724 7.3724 20.113 7.11296 19.5941 6.59411L16.4059 3.40589C15.887 2.88703 15.6276 2.6276 15.3249 2.44208C15.0564 2.27759 14.7638 2.15638 14.4577 2.08289C14.1124 2 13.7455 2 13.0118 2H8.5C8.03558 2 7.80337 2 7.60842 2.02567C6.26222 2.2029 5.2029 3.26222 5.02567 4.60842C5 4.80337 5 5.03558 5 5.5M9 14.5L11.5 12L9 9.5M5 9.5L2.5 12L5 14.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Button>
      </div>

      {latestAudit ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4" data-testid="harness-score-cards">
          <ScoreCard label="Global" value={latestAudit.globalScore} />
          <ScoreCard label="Context" value={latestAudit.dimensionScores.context} />
          <ScoreCard label="Skills" value={latestAudit.dimensionScores.skills} />
          <ScoreCard label="Tools/MCP" value={latestAudit.dimensionScores.toolsMcp} />
        </div>
      ) : (
        <p data-testid="harness-empty-state" className="text-sm text-gray-600">
          No audit history yet. Run your first harness audit.
        </p>
      )}

      <div className="rounded border border-gray-200">
        <div className="border-b border-gray-200 px-4 py-3">
          <h3 className="font-medium">Audit history</h3>
        </div>
        <div className="p-4">
          {auditHistory.isLoading ? (
            <p data-testid="harness-history-loading">Loading history...</p>
          ) : auditHistory.data && auditHistory.data.length > 0 ? (
            <ul className="space-y-2" data-testid="harness-history-list">
              {auditHistory.data.map((entry) => (
                <li key={entry.scannedAt} className="rounded border border-gray-200 p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>Scanned at {new Date(entry.scannedAt).toLocaleString()}</span>
                    <span className="font-semibold">Score {entry.globalScore}</span>
                  </div>
                  <div className="mt-2 text-xs text-gray-600">
                    P0: {entry.findingCounts.p0} | P1: {entry.findingCounts.p1} | P2: {entry.findingCounts.p2}
                  </div>
                  {entry.requiresOverride ? (
                    <div className="mt-2 text-xs text-amber-700">Soft gate active: override required.</div>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p>No history available.</p>
          )}
        </div>
      </div>
    </section>
  )
}

function ScoreCard(props: { label: string; value: number }) {
  return (
    <article className="rounded border border-gray-200 p-3">
      <p className="text-xs text-gray-600">{props.label}</p>
      <p className="text-2xl font-semibold">{props.value}</p>
    </article>
  )
}
