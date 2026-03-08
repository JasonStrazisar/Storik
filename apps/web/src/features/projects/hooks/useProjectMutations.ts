import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { CreateProjectPayload, SelectProjectPayload } from "@storik/shared"

export function useCreateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateProjectPayload) => {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error("Failed to create project")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] })
      queryClient.invalidateQueries({ queryKey: ["activeProject"] })
    },
  })
}

export function useSelectProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: SelectProjectPayload) => {
      const res = await fetch("/api/projects/active", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error("Failed to select project")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activeProject"] })
    },
  })
}

export function useArchiveProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { id: string }) => {
      const res = await fetch(`/api/projects/${payload.id}/archive`, {
        method: "POST",
      })
      if (!res.ok) throw new Error("Failed to archive project")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] })
      queryClient.invalidateQueries({ queryKey: ["activeProject"] })
    },
  })
}

export function useRestoreProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { id: string }) => {
      const res = await fetch(`/api/projects/${payload.id}/restore`, {
        method: "POST",
      })
      if (!res.ok) throw new Error("Failed to restore project")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] })
      queryClient.invalidateQueries({ queryKey: ["activeProject"] })
    },
  })
}
