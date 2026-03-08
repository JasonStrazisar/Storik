import { Effect, Option, Context } from "effect"
import { Project } from "../../domain/Project"
import { ProjectNotFoundError, ProjectNameInvalidError, RepositoryError } from "../../domain/Project.errors"
import type { ProjectId } from "@storik/shared"

export interface RenameProjectRepository {
  readonly findById: (id: ProjectId) => Effect.Effect<Option.Option<Project>, RepositoryError>
  readonly save: (project: Project) => Effect.Effect<Project, RepositoryError>
}
export const RenameProjectRepository = Context.GenericTag<RenameProjectRepository>("RenameProjectRepository")

export interface RenameProjectCommand {
  readonly projectId: ProjectId
  readonly newName: string
}

export const handleRenameProject = (cmd: RenameProjectCommand): Effect.Effect<Project, ProjectNotFoundError | ProjectNameInvalidError | RepositoryError, RenameProjectRepository> =>
  Effect.gen(function* () {
    const repo = yield* RenameProjectRepository
    const maybeProject = yield* repo.findById(cmd.projectId)
    const project = yield* Option.match(maybeProject, {
      onNone: () => Effect.fail(new ProjectNotFoundError({ id: cmd.projectId })),
      onSome: (p) => Effect.succeed(p),
    })
    const renamed = yield* Effect.try({
      try: () => project.rename(cmd.newName),
      catch: (e) => e as ProjectNameInvalidError,
    })
    return yield* repo.save(renamed)
  })
