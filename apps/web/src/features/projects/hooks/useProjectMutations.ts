import { useMutation, useQueryClient } from "@tanstack/react-query"
import type {
  CreateProjectPayload,
  RenameProjectPayload,
  SelectProjectPayload,
  ArchiveProjectPayload,
  RestoreProjectPayload,
} from "@storik/shared"

export const useCreateProject = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateProjectPayload) => {
      const res = await fetch("/api/project/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || "Create failed")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] })
    },
  })
}

export const useSelectProject = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: SelectProjectPayload) => {
      const res = await fetch("/api/project/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error("Select failed")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", "active"] })
      queryClient.invalidateQueries({ queryKey: ["projects", "list"] })
    },
  })
}

export const useRenameProject = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: RenameProjectPayload) => {
      const res = await fetch("/api/project/rename", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error("Rename failed")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] })
    },
  })
}

export const useArchiveProject = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: ArchiveProjectPayload) => {
      const res = await fetch("/api/project/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error("Archive failed")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] })
    },
  })
}

export const useRestoreProject = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: RestoreProjectPayload) => {
      const res = await fetch("/api/project/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error("Restore failed")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] })
    },
  })
}
