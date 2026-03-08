import { HttpRouter, HttpServer, HttpServerResponse } from "@effect/platform"
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { Effect, Layer, Option } from "effect"
import { createServer } from "node:http"
import { projectsRouter } from "./features/projects/router"
import { ProjectRepository } from "./features/projects/domain/ProjectRepository"
import { PathValidationPort } from "./features/projects/application/PathValidationPort"
import { RenameProjectRepository } from "./features/projects/application/commands/RenameProject"
import { Project } from "./features/projects/domain/Project"
import { RepositoryError } from "./features/projects/domain/Project.errors"
import type { ProjectId } from "@storik/shared"

// In-memory repository (to be replaced by SQLite adapter in TKT-09)
const makeInMemoryProjectRepository = (): ProjectRepository => {
  const store = new Map<ProjectId, Project>()
  let activeProjectId: ProjectId | null = null

  return {
    save: (p) => {
      store.set(p.id, p)
      return Effect.succeed(p)
    },
    findById: (id) => {
      const found = store.get(id)
      return Effect.succeed(found ? Option.some(found) : Option.none())
    },
    findAll: () => Effect.succeed([...store.values()]),
    findByPath: (path) => {
      const found = [...store.values()].find((p) => p.path === path)
      return Effect.succeed(found ? Option.some(found) : Option.none())
    },
    getActiveProjectId: () =>
      Effect.succeed(activeProjectId ? Option.some(activeProjectId) : Option.none()),
    setActiveProjectId: (id) => {
      activeProjectId = id
      return Effect.succeed(undefined)
    },
    clearActiveProjectId: () => {
      activeProjectId = null
      return Effect.succeed(undefined)
    },
  }
}

// Simple path validation: must be absolute path
const SimplePathValidationLive = Layer.succeed(PathValidationPort, {
  validate: (path) =>
    Effect.succeed(
      path.startsWith("/") ? { valid: true as const } : { valid: false as const, reason: "Path must be absolute" }
    ),
})

// Share the same in-memory repo instance across both tags
const repo = makeInMemoryProjectRepository()

const ProjectRepositoryLive = Layer.succeed(ProjectRepository, repo)

const RenameProjectRepositoryLive = Layer.succeed(RenameProjectRepository, {
  findById: repo.findById,
  save: repo.save,
})

const AppLayer = Layer.mergeAll(
  ProjectRepositoryLive,
  RenameProjectRepositoryLive,
  SimplePathValidationLive
)

const router = HttpRouter.empty.pipe(
  HttpRouter.get("/", Effect.succeed(HttpServerResponse.text("ok"))),
  HttpRouter.concat(projectsRouter)
)

const app = router.pipe(HttpServer.serve())

const ServerLive = NodeHttpServer.layer(createServer, { port: 3001 })

NodeRuntime.runMain(
  Layer.launch(app).pipe(
    Effect.provide(ServerLive),
    Effect.provide(AppLayer)
  )
)
