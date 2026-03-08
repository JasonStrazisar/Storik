import { Effect, Option } from "effect"
import { Project } from "../../domain/Project"
import { ProjectRepository } from "../../domain/ProjectRepository"
import { PathValidationPort } from "../PathValidationPort"
import { RepositoryError, ProjectNameInvalidError } from "../../domain/Project.errors"
import { DuplicatePathError, PathValidationError } from "../errors/ProjectCommandError"

export interface CreateProjectCommand {
  readonly name: string
  readonly path: string
}

export const handleCreateProject = (cmd: CreateProjectCommand): Effect.Effect<Project, PathValidationError | DuplicatePathError | ProjectNameInvalidError | RepositoryError, ProjectRepository | PathValidationPort> =>
  Effect.gen(function* () {
    const pathValidator = yield* PathValidationPort
    const repo = yield* ProjectRepository

    const validationResult = yield* pathValidator.validate(cmd.path)
    if (!validationResult.valid) {
      return yield* Effect.fail(new PathValidationError({ path: cmd.path, reason: validationResult.reason }))
    }

    const existing = yield* repo.findByPath(cmd.path)
    if (Option.isSome(existing)) {
      return yield* Effect.fail(new DuplicatePathError({ path: cmd.path }))
    }

    const project = yield* Effect.try({
      try: () => Project.create({ name: cmd.name, path: cmd.path }),
      catch: (e) => e as ProjectNameInvalidError,
    })

    return yield* repo.save(project)
  })
