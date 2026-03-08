import { Effect, Option } from "effect"
import { Project } from "../../domain/Project"
import { ProjectRepository } from "../../domain/ProjectRepository"
import { ProjectNotFoundError, ProjectAlreadyArchivedError, RepositoryError } from "../../domain/Project.errors"
import type { ProjectId } from "@storik/shared"

export const handleArchiveProject = (cmd: { projectId: ProjectId }): Effect.Effect<Project, ProjectNotFoundError | ProjectAlreadyArchivedError | RepositoryError, ProjectRepository> =>
  Effect.gen(function* () {
    const repo = yield* ProjectRepository
    const maybeProject = yield* repo.findById(cmd.projectId)
    const project = yield* Option.match(maybeProject, {
      onNone: () => Effect.fail(new ProjectNotFoundError({ id: cmd.projectId })),
      onSome: (p) => Effect.succeed(p),
    })

    const archived = yield* Effect.try({
      try: () => project.archive(),
      catch: (e) => e as ProjectAlreadyArchivedError,
    })

    const saved = yield* repo.save(archived)

    const maybeActiveId = yield* repo.getActiveProjectId()
    yield* Option.match(maybeActiveId, {
      onNone: () => Effect.succeed(undefined),
      onSome: (activeId) =>
        activeId === saved.id
          ? repo.clearActiveProjectId()
          : Effect.succeed(undefined),
    })

    return saved
  })
