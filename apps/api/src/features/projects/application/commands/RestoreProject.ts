import { Effect, Option } from "effect"
import { Project } from "../../domain/Project"
import { ProjectRepository } from "../../domain/ProjectRepository"
import { ProjectNotFoundError, ProjectAlreadyActiveError, RepositoryError } from "../../domain/Project.errors"
import type { ProjectId } from "@storik/shared"

export const handleRestoreProject = (cmd: { projectId: ProjectId }): Effect.Effect<Project, ProjectNotFoundError | ProjectAlreadyActiveError | RepositoryError, ProjectRepository> =>
  Effect.gen(function* () {
    const repo = yield* ProjectRepository
    const maybeProject = yield* repo.findById(cmd.projectId)
    const project = yield* Option.match(maybeProject, {
      onNone: () => Effect.fail(new ProjectNotFoundError({ id: cmd.projectId })),
      onSome: (p) => Effect.succeed(p),
    })

    const restored = yield* Effect.try({
      try: () => project.restore(),
      catch: (e) => e as ProjectAlreadyActiveError,
    })

    return yield* repo.save(restored)
  })
