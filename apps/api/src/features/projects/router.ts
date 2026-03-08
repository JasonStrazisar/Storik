import { HttpRouter, HttpServerRequest, HttpServerResponse } from "@effect/platform"
import { Effect } from "effect"
import * as Schema from "effect/Schema"
import {
  CreateProjectPayload,
  RenameProjectPayload,
  SelectProjectPayload,
  ArchiveProjectPayload,
  RestoreProjectPayload,
} from "@storik/shared"
import { ProjectRepository } from "./domain/ProjectRepository"
import {
  ProjectNotFoundError,
  ProjectNameInvalidError,
  ProjectAlreadyArchivedError,
  ProjectAlreadyActiveError,
  RepositoryError,
} from "./domain/Project.errors"
import { DuplicatePathError, PathValidationError } from "./application/errors/ProjectCommandError"
import { handleCreateProject } from "./application/commands/CreateProject"
import { handleRenameProject, RenameProjectRepository } from "./application/commands/RenameProject"
import { handleSelectActiveProject } from "./application/commands/SelectActiveProject"
import { handleArchiveProject } from "./application/commands/ArchiveProject"
import { handleRestoreProject } from "./application/commands/RestoreProject"
import { handleGetActiveProject } from "./application/queries/GetActiveProject"

const errorResponse = (status: number, body: Record<string, unknown>) =>
  HttpServerResponse.json(body, { status })

const handle404 = (err: ProjectNotFoundError) =>
  errorResponse(404, { error: "not_found", message: `Project ${err.id} not found` })

const handle500 = (_err: RepositoryError) =>
  errorResponse(500, { error: "database", message: "Internal database error" })

export const projectsRouter = HttpRouter.empty.pipe(
  HttpRouter.post(
    "/project/create",
    Effect.gen(function* () {
      const req = yield* HttpServerRequest.HttpServerRequest
      const body = yield* req.json
      const payload = yield* Schema.decodeUnknown(CreateProjectPayload)(body)
      const project = yield* handleCreateProject(payload)
      return yield* HttpServerResponse.json(project, { status: 201 })
    }).pipe(
      Effect.catchTags({
        ProjectNameInvalidError: (err) =>
          errorResponse(400, { error: "validation", reason: err.reason }),
        DuplicatePathError: (err) =>
          errorResponse(400, { error: "duplicate_path", path: err.path }),
        PathValidationError: (err) =>
          errorResponse(400, { error: "path_validation", path: err.path, reason: err.reason }),
        RepositoryError: handle500,
        ParseError: (_err) =>
          errorResponse(400, { error: "validation", reason: "Invalid request body" }),
        RequestError: (_err) =>
          errorResponse(400, { error: "validation", reason: "Could not parse request body" }),
      })
    )
  ),
  HttpRouter.post(
    "/project/rename",
    Effect.gen(function* () {
      const req = yield* HttpServerRequest.HttpServerRequest
      const body = yield* req.json
      const payload = yield* Schema.decodeUnknown(RenameProjectPayload)(body)
      const project = yield* handleRenameProject({ projectId: payload.id, newName: payload.newName })
      return yield* HttpServerResponse.json(project, { status: 200 })
    }).pipe(
      Effect.catchTags({
        ProjectNotFoundError: handle404,
        ProjectNameInvalidError: (err) =>
          errorResponse(400, { error: "validation", reason: err.reason }),
        RepositoryError: handle500,
        ParseError: (_err) =>
          errorResponse(400, { error: "validation", reason: "Invalid request body" }),
        RequestError: (_err) =>
          errorResponse(400, { error: "validation", reason: "Could not parse request body" }),
      })
    )
  ),
  HttpRouter.post(
    "/project/select",
    Effect.gen(function* () {
      const req = yield* HttpServerRequest.HttpServerRequest
      const body = yield* req.json
      const payload = yield* Schema.decodeUnknown(SelectProjectPayload)(body)
      const result = yield* handleSelectActiveProject({ projectId: payload.id })
      return yield* HttpServerResponse.json(result, { status: 200 })
    }).pipe(
      Effect.catchTags({
        ProjectNotFoundError: handle404,
        RepositoryError: handle500,
        ParseError: (_err) =>
          errorResponse(400, { error: "validation", reason: "Invalid request body" }),
        RequestError: (_err) =>
          errorResponse(400, { error: "validation", reason: "Could not parse request body" }),
      })
    )
  ),
  HttpRouter.post(
    "/project/archive",
    Effect.gen(function* () {
      const req = yield* HttpServerRequest.HttpServerRequest
      const body = yield* req.json
      const payload = yield* Schema.decodeUnknown(ArchiveProjectPayload)(body)
      const project = yield* handleArchiveProject({ projectId: payload.id })
      return yield* HttpServerResponse.json(project, { status: 200 })
    }).pipe(
      Effect.catchTags({
        ProjectNotFoundError: handle404,
        ProjectAlreadyArchivedError: (err) =>
          errorResponse(400, { error: "already_archived", id: err.id }),
        RepositoryError: handle500,
        ParseError: (_err) =>
          errorResponse(400, { error: "validation", reason: "Invalid request body" }),
        RequestError: (_err) =>
          errorResponse(400, { error: "validation", reason: "Could not parse request body" }),
      })
    )
  ),
  HttpRouter.post(
    "/project/restore",
    Effect.gen(function* () {
      const req = yield* HttpServerRequest.HttpServerRequest
      const body = yield* req.json
      const payload = yield* Schema.decodeUnknown(RestoreProjectPayload)(body)
      const project = yield* handleRestoreProject({ projectId: payload.id })
      return yield* HttpServerResponse.json(project, { status: 200 })
    }).pipe(
      Effect.catchTags({
        ProjectNotFoundError: handle404,
        ProjectAlreadyActiveError: (err) =>
          errorResponse(400, { error: "already_active", id: err.id }),
        RepositoryError: handle500,
        ParseError: (_err) =>
          errorResponse(400, { error: "validation", reason: "Invalid request body" }),
        RequestError: (_err) =>
          errorResponse(400, { error: "validation", reason: "Could not parse request body" }),
      })
    )
  ),
  HttpRouter.get(
    "/project/list",
    Effect.gen(function* () {
      const repo = yield* ProjectRepository
      const all = yield* repo.findAll()
      const active = all.filter((p) => p.status === "active")
      return yield* HttpServerResponse.json(active, { status: 200 })
    }).pipe(
      Effect.catchTags({
        RepositoryError: handle500,
      })
    )
  ),
  HttpRouter.get(
    "/project/list-archived",
    Effect.gen(function* () {
      const repo = yield* ProjectRepository
      const all = yield* repo.findAll()
      const archived = all.filter((p) => p.status === "archived")
      return yield* HttpServerResponse.json(archived, { status: 200 })
    }).pipe(
      Effect.catchTags({
        RepositoryError: handle500,
      })
    )
  ),
  HttpRouter.get(
    "/project/active",
    Effect.gen(function* () {
      const result = yield* handleGetActiveProject()
      return yield* HttpServerResponse.json(result, { status: 200 })
    }).pipe(
      Effect.catchTags({
        RepositoryError: handle500,
      })
    )
  )
)
