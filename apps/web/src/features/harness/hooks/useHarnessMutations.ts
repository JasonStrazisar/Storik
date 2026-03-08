import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { RunHarnessAuditPayload, SetHarnessGateOverridePayload } from "@storik/shared"
import { desktopClient } from "../../projects/infrastructure/desktopClient"

export function useRunHarnessAudit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: RunHarnessAuditPayload) => desktopClient.runHarnessAudit(payload),
    onSuccess: (_, payload) => {
      queryClient.invalidateQueries({ queryKey: ["harness", "history", payload.projectId] })
      queryClient.invalidateQueries({ queryKey: ["harness", "gate", payload.projectId] })
    },
  })
}

export function useSetHarnessGateOverride() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: SetHarnessGateOverridePayload) => desktopClient.setHarnessGateOverride(payload),
    onSuccess: (_, payload) => {
      queryClient.invalidateQueries({ queryKey: ["harness", "gate", payload.projectId] })
    },
  })
}
