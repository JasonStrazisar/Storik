import { Effect } from "effect"
import { Project } from "../../domain/Project"
import { ProjectRepository } from "../../domain/ProjectRepository"
import { PathValidationPort } from "../PathValidationPort"
import { RepositoryError, ProjectNameInvalidError } from "../../domain/Project.errors"

export interface CreateProjectCommand {
  readonly name: string
  readonly path: string
}

export const handleCreateProject = (cmd: CreateProjectCommand): Effect.Effect<Project, RepositoryError | ProjectNameInvalidError, ProjectRepository | PathValidationPort> =>
  Effect.gen(function* () {
    const pathValidator = yield* PathValidationPort
    const repo = yield* ProjectRepository
    const validationResult = yield* pathValidator.validate(cmd.path)
    // Error paths added in TKT-05
    const project = yield* Effect.try({ try: () => Project.create({ name: cmd.name, path: cmd.path }), catch: (e) => e as ProjectNameInvalidError })
    return yield* repo.save(project)
  })
