import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { CreateProjectPayload, SelectProjectPayload } from "@storik/shared"

export function useCreateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateProjectPayload) => {
      const res = await fetch("/api/project/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.message || `Request failed with status ${res.status}`)
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] })
    },
  })
}

export function useSelectProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: SelectProjectPayload) => {
      const res = await fetch("/api/project/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.message || `Request failed with status ${res.status}`)
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", "active"] })
      queryClient.invalidateQueries({ queryKey: ["projects", "list"] })
    },
  })
}
