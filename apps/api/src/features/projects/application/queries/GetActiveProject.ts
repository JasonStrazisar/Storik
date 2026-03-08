import { Effect, Option } from "effect"
import { Project } from "../../domain/Project"
import { ProjectRepository } from "../../domain/ProjectRepository"
import { RepositoryError } from "../../domain/Project.errors"

export type GetActiveProjectResult =
  | { status: "active"; project: Project }
  | { status: "onboarding-required" }

export const handleGetActiveProject = (): Effect.Effect<GetActiveProjectResult, RepositoryError, ProjectRepository> =>
  Effect.gen(function* () {
    const repo = yield* ProjectRepository
    const maybeId = yield* repo.getActiveProjectId()

    return yield* Option.match(maybeId, {
      onNone: () => Effect.succeed({ status: "onboarding-required" as const }),
      onSome: (id) =>
        Effect.gen(function* () {
          const maybeProject = yield* repo.findById(id)
          return yield* Option.match(maybeProject, {
            onNone: () =>
              Effect.gen(function* () {
                yield* repo.clearActiveProjectId()
                return { status: "onboarding-required" as const }
              }),
            onSome: (p) =>
              Effect.gen(function* () {
                if (p.status === "archived") {
                  yield* repo.clearActiveProjectId()
                  return { status: "onboarding-required" as const }
                }
                return { status: "active" as const, project: p }
              }),
          })
        }),
    })
  })
