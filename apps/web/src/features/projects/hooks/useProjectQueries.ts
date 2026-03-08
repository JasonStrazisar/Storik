import { useQuery } from "@tanstack/react-query"
import type { Project } from "@storik/shared"
import { desktopClient, type ActiveProjectResponse } from "../infrastructure/desktopClient"

export function useProjectList() {
  return useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: () => desktopClient.listProjects(),
  })
}

export function useActiveProject() {
  return useQuery<ActiveProjectResponse>({
    queryKey: ["activeProject"],
    queryFn: () => desktopClient.getActiveProject(),
  })
}

export function useArchivedProjectList() {
  return useQuery<Project[]>({
    queryKey: ["projects", "archived"],
    queryFn: () => desktopClient.listArchivedProjects(),
  })
}
