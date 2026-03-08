import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { Effect, Layer, Option } from "effect"
import * as os from "node:os"
import * as fs from "node:fs"
import * as path from "node:path"
import { SqlClient } from "@effect/sql"
import { SqliteClient } from "@effect/sql-sqlite-node"
import { Project } from "../domain/Project"
import { ProjectRepository } from "../domain/ProjectRepository"
import { SqliteProjectRepositoryLive } from "./SqliteProjectRepository"
import { handleGetActiveProject } from "../application/queries/GetActiveProject"
import type { ProjectId } from "@storik/shared"

const createProjectsTable = `
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  path TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK(status IN ('active', 'archived')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
)`

const createActiveTable = `
CREATE TABLE IF NOT EXISTS project_active (
  id INTEGER PRIMARY KEY CHECK(id = 1),
  project_id TEXT REFERENCES projects(id)
)`

const MigrationLayer = Layer.effectDiscard(
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient
    yield* sql.unsafe(createProjectsTable)
    yield* sql.unsafe(createActiveTable)
  }),
)

const makeDbLayer = (filename: string) => {
  const sqliteLayer = SqliteClient.layer({ filename })
  return SqliteProjectRepositoryLive.pipe(
    Layer.provideMerge(MigrationLayer),
    Layer.provideMerge(sqliteLayer),
  )
}

describe("SqliteProjectRepository active project persistence", () => {
  let dbPath: string

  beforeEach(() => {
    dbPath = path.join(os.tmpdir(), `storik-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`)
  })

  afterEach(() => {
    try { fs.unlinkSync(dbPath) } catch {}
    try { fs.unlinkSync(dbPath + "-wal") } catch {}
    try { fs.unlinkSync(dbPath + "-shm") } catch {}
  })

  it("active project id survives repo instance restart", async () => {
    const project = Project.create({ name: "Persist Me", path: "/home/user/persist" })

    // First instance: save project and set active
    await Effect.runPromise(
      Effect.gen(function* () {
        const repo = yield* ProjectRepository
        yield* repo.save(project)
        yield* repo.setActiveProjectId(project.id)
      }).pipe(Effect.provide(makeDbLayer(dbPath)), Effect.scoped),
    )

    // Second instance (simulates restart): read active id
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const repo = yield* ProjectRepository
        return yield* repo.getActiveProjectId()
      }).pipe(Effect.provide(makeDbLayer(dbPath)), Effect.scoped),
    )

    expect(Option.isSome(result)).toBe(true)
    if (Option.isSome(result)) {
      expect(result.value).toBe(project.id)
    }
  })

  it("setActiveProjectId to second project persists across restart", async () => {
    const project1 = Project.create({ name: "First", path: "/home/user/first" })
    const project2 = Project.create({ name: "Second", path: "/home/user/second" })

    // First instance: save both, set active to second
    await Effect.runPromise(
      Effect.gen(function* () {
        const repo = yield* ProjectRepository
        yield* repo.save(project1)
        yield* repo.save(project2)
        yield* repo.setActiveProjectId(project2.id)
      }).pipe(Effect.provide(makeDbLayer(dbPath)), Effect.scoped),
    )

    // Second instance: verify second project is active
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const repo = yield* ProjectRepository
        return yield* repo.getActiveProjectId()
      }).pipe(Effect.provide(makeDbLayer(dbPath)), Effect.scoped),
    )

    expect(Option.isSome(result)).toBe(true)
    if (Option.isSome(result)) {
      expect(result.value).toBe(project2.id)
    }
  })

  it("archiving a project does not auto-clear active project id", async () => {
    const project = Project.create({ name: "Archive Me", path: "/home/user/archive" })

    // Save, set active, then archive the project
    await Effect.runPromise(
      Effect.gen(function* () {
        const repo = yield* ProjectRepository
        yield* repo.save(project)
        yield* repo.setActiveProjectId(project.id)
        const archived = project.archive()
        yield* repo.save(archived)
      }).pipe(Effect.provide(makeDbLayer(dbPath)), Effect.scoped),
    )

    // Active project id should still be set (repo doesn't auto-clear on archive)
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const repo = yield* ProjectRepository
        return yield* repo.getActiveProjectId()
      }).pipe(Effect.provide(makeDbLayer(dbPath)), Effect.scoped),
    )

    expect(Option.isSome(result)).toBe(true)
    if (Option.isSome(result)) {
      expect(result.value).toBe(project.id)
    }
  })

  it("GetActiveProject returns onboarding-required for archived active project", async () => {
    const project = Project.create({ name: "Archive Query", path: "/home/user/archive-query" })

    // Save, set active, then archive
    await Effect.runPromise(
      Effect.gen(function* () {
        const repo = yield* ProjectRepository
        yield* repo.save(project)
        yield* repo.setActiveProjectId(project.id)
        const archived = project.archive()
        yield* repo.save(archived)
      }).pipe(Effect.provide(makeDbLayer(dbPath)), Effect.scoped),
    )

    // GetActiveProject should return onboarding-required because project is archived
    const result = await Effect.runPromise(
      handleGetActiveProject().pipe(
        Effect.provide(makeDbLayer(dbPath)),
        Effect.scoped,
      ),
    )

    expect(result.status).toBe("onboarding-required")
  })
})
