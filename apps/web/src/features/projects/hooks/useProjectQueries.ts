import { useQuery } from "@tanstack/react-query"
import type { Project, ActiveProject } from "@storik/shared"

export const useActiveProject = () =>
  useQuery({
    queryKey: ["projects", "active"],
    queryFn: async () => {
      const res = await fetch("/api/project/active")
      if (!res.ok) throw new Error("Failed to fetch active project")
      return res.json() as Promise<ActiveProject | null>
    },
    staleTime: 30_000,
  })

export const useProjectList = () =>
  useQuery({
    queryKey: ["projects", "list"],
    queryFn: async () => {
      const res = await fetch("/api/project/list")
      if (!res.ok) throw new Error("Failed to fetch projects")
      return res.json() as Promise<Project[]>
    },
  })

export const useArchivedProjectList = () =>
  useQuery({
    queryKey: ["projects", "archived"],
    queryFn: async () => {
      const res = await fetch("/api/project/list-archived")
      if (!res.ok) throw new Error("Failed to fetch archived projects")
      return res.json() as Promise<Project[]>
    },
  })
