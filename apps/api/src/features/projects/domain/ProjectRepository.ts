import { Effect, Option, Context } from "effect"
import { Project } from "./Project"
import { RepositoryError } from "./Project.errors"
import type { ProjectId } from "@storik/shared"

export interface ProjectRepository {
  readonly save: (project: Project) => Effect.Effect<Project, RepositoryError>
  readonly findById: (id: ProjectId) => Effect.Effect<Option.Option<Project>, RepositoryError>
  readonly findAll: () => Effect.Effect<Project[], RepositoryError>
  readonly findByPath: (path: string) => Effect.Effect<Option.Option<Project>, RepositoryError>
  readonly getActiveProjectId: () => Effect.Effect<Option.Option<ProjectId>, RepositoryError>
  readonly setActiveProjectId: (id: ProjectId) => Effect.Effect<void, RepositoryError>
  readonly clearActiveProjectId: () => Effect.Effect<void, RepositoryError>
}

export const ProjectRepository = Context.GenericTag<ProjectRepository>("ProjectRepository")
