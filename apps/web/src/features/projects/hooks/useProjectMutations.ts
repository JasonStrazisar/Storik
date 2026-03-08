import { useMutation, useQueryClient } from "@tanstack/react-query"
import type {
  ArchiveProjectPayload,
  CreateProjectPayload,
  RestoreProjectPayload,
  SelectProjectPayload,
} from "@storik/shared"
import { desktopClient } from "../infrastructure/desktopClient"

export function useCreateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateProjectPayload) => desktopClient.createProject(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] })
      queryClient.invalidateQueries({ queryKey: ["activeProject"] })
    },
  })
}

export function useSelectProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: SelectProjectPayload) => desktopClient.selectActiveProject(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activeProject"] })
      queryClient.invalidateQueries({ queryKey: ["projects"] })
    },
  })
}

export function useArchiveProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: ArchiveProjectPayload) => desktopClient.archiveProject(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] })
      queryClient.invalidateQueries({ queryKey: ["activeProject"] })
      queryClient.invalidateQueries({ queryKey: ["projects", "archived"] })
    },
  })
}

export function useRestoreProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: RestoreProjectPayload) => desktopClient.restoreProject(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] })
      queryClient.invalidateQueries({ queryKey: ["activeProject"] })
      queryClient.invalidateQueries({ queryKey: ["projects", "archived"] })
    },
  })
}
