import { useQuery } from "@tanstack/react-query"
import type { ListHarnessAuditHistoryPayload, RunHarnessAuditPayload } from "@storik/shared"
import { desktopClient } from "../../projects/infrastructure/desktopClient"

export function useHarnessAuditHistory(payload: ListHarnessAuditHistoryPayload | null) {
  return useQuery({
    queryKey: ["harness", "history", payload?.projectId],
    queryFn: () => desktopClient.listHarnessAuditHistory(payload as ListHarnessAuditHistoryPayload),
    enabled: !!payload?.projectId,
  })
}

export function useHarnessGateStatus(payload: ListHarnessAuditHistoryPayload | null) {
  return useQuery({
    queryKey: ["harness", "gate", payload?.projectId],
    queryFn: () => desktopClient.getHarnessGateStatus(payload as ListHarnessAuditHistoryPayload),
    enabled: !!payload?.projectId,
  })
}

export function useHarnessLatestAudit(payload: ListHarnessAuditHistoryPayload | null) {
  const history = useHarnessAuditHistory(payload)
  return {
    ...history,
    data: history.data?.[0] ?? null,
  }
}

export function runHarnessAudit(payload: RunHarnessAuditPayload) {
  return desktopClient.runHarnessAudit(payload)
}
