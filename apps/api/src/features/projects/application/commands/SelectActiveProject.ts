import { Effect, Option } from "effect"
import { Project } from "../../domain/Project"
import { ProjectRepository } from "../../domain/ProjectRepository"
import { ProjectNotFoundError, RepositoryError } from "../../domain/Project.errors"
import type { ProjectId } from "@storik/shared"

export type SelectActiveProjectResult =
  | { status: "selected"; project: Project }
  | { status: "fallback"; project: Project }
  | { status: "onboarding-required" }

export const handleSelectActiveProject = (cmd: { projectId: ProjectId }): Effect.Effect<SelectActiveProjectResult, ProjectNotFoundError | RepositoryError, ProjectRepository> =>
  Effect.gen(function* () {
    const repo = yield* ProjectRepository
    const maybeProject = yield* repo.findById(cmd.projectId)
    const project = yield* Option.match(maybeProject, {
      onNone: () => Effect.fail(new ProjectNotFoundError({ id: cmd.projectId })),
      onSome: (p) => Effect.succeed(p),
    })

    if (project.status === "active") {
      yield* repo.setActiveProjectId(project.id)
      return { status: "selected" as const, project }
    }

    // Project is archived, look for fallback
    const allProjects = yield* repo.findAll()
    const activeProjects = allProjects.filter(p => p.status === "active")

    if (activeProjects.length > 0) {
      const fallback = activeProjects[0]
      yield* repo.setActiveProjectId(fallback.id)
      return { status: "fallback" as const, project: fallback }
    }

    // No active projects
    yield* repo.clearActiveProjectId()
    return { status: "onboarding-required" as const }
  })
