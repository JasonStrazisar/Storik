import { useQuery } from "@tanstack/react-query"
import type { Project } from "@storik/shared"

export function useProjectList() {
  return useQuery<Project[]>({
    queryKey: ["projects", "list"],
    queryFn: async () => {
      const res = await fetch("/api/projects")
      if (!res.ok) throw new Error("Failed to fetch projects")
      return res.json()
    },
  })
}

export function useActiveProject() {
  return useQuery({
    queryKey: ["projects", "active"],
    queryFn: async () => {
      const res = await fetch("/api/projects/active")
      if (!res.ok) throw new Error("Failed to fetch active project")
      return res.json()
    },
  })
}
