import { useQuery } from "@tanstack/react-query"
import type { Project } from "@storik/shared"

export function useProjectList() {
  return useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await fetch("/api/projects")
      if (!res.ok) throw new Error("Failed to fetch projects")
      return res.json()
    },
  })
}

type ActiveProjectResponse =
  | { status: "active"; project: Project }
  | { status: "onboarding-required" }

export function useActiveProject() {
  return useQuery<ActiveProjectResponse>({
    queryKey: ["activeProject"],
    queryFn: async () => {
      const res = await fetch("/api/projects/active")
      if (res.status === 404) return { status: "onboarding-required" as const }
      if (!res.ok) throw new Error("Failed to fetch active project")
      const project = await res.json()
      return { status: "active" as const, project }
    },
  })
}

export function useArchivedProjectList() {
  return useQuery<Project[]>({
    queryKey: ["projects", "archived"],
    queryFn: async () => {
      const res = await fetch("/api/projects/archived")
      if (!res.ok) throw new Error("Failed to fetch archived projects")
      return res.json()
    },
  })
}
