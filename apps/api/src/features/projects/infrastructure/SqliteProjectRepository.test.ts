import { describe, it, expect } from "vitest"
import { Effect, Layer, Option } from "effect"
import { SqlClient } from "@effect/sql"
import { SqliteClient } from "@effect/sql-sqlite-node"
import { ProjectId } from "@storik/shared"
import * as Schema from "effect/Schema"
import { Project } from "../domain/Project"
import { ProjectRepository } from "../domain/ProjectRepository"
import { RepositoryError } from "../domain/Project.errors"
import { SqliteProjectRepositoryLive } from "./SqliteProjectRepository"
import * as fs from "node:fs"
import * as path from "node:path"

const migrationSql = fs.readFileSync(
  path.join(__dirname, "migrations", "001_projects.sql"),
  "utf-8",
)

const makeTestLayer = () => {
  const sqliteLayer = SqliteClient.layer({ filename: ":memory:" })

  const migratedLayer = Layer.effectDiscard(
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient
      // Execute each statement separately (better-sqlite3 doesn't support multi-statement)
      for (const statement of migrationSql.split(";").filter((s) => s.trim())) {
        yield* sql.unsafe(statement)
      }
    }),
  )

  return SqliteProjectRepositoryLive.pipe(
    Layer.provideMerge(migratedLayer),
    Layer.provideMerge(sqliteLayer),
  )
}

const runTest = <A, E>(effect: Effect.Effect<A, E, ProjectRepository>) =>
  Effect.runPromise(Effect.provide(effect, makeTestLayer()))

const makeProject = (overrides?: { name?: string; path?: string }) =>
  Project.create({
    name: overrides?.name ?? "Test Project",
    path: overrides?.path ?? "/test/project",
  })

describe("SqliteProjectRepository", () => {
  it("save + findById returns saved project", async () => {
    await runTest(
      Effect.gen(function* () {
        const repo = yield* ProjectRepository
        const project = makeProject()
        yield* repo.save(project)
        const found = yield* repo.findById(project.id)
        expect(Option.isSome(found)).toBe(true)
        const p = Option.getOrThrow(found)
        expect(p.id).toBe(project.id)
        expect(p.name).toBe(project.name)
        expect(p.path).toBe(project.path)
        expect(p.status).toBe(project.status)
      }),
    )
  })

  it("save updates updatedAt on re-save", async () => {
    await runTest(
      Effect.gen(function* () {
        const repo = yield* ProjectRepository
        const project = makeProject()
        yield* repo.save(project)
        const renamed = project.rename("New Name")
        yield* repo.save(renamed)
        const found = yield* repo.findById(project.id)
        const p = Option.getOrThrow(found)
        expect(p.name).toBe("New Name")
        expect(p.updatedAt).toBe(renamed.updatedAt)
      }),
    )
  })

  it("findById with unknown id returns None", async () => {
    await runTest(
      Effect.gen(function* () {
        const repo = yield* ProjectRepository
        const id = Schema.decodeSync(ProjectId)("unknown-id")
        const found = yield* repo.findById(id)
        expect(Option.isNone(found)).toBe(true)
      }),
    )
  })

  it("findAll returns all saved projects", async () => {
    await runTest(
      Effect.gen(function* () {
        const repo = yield* ProjectRepository
        const p1 = makeProject({ name: "Project 1", path: "/p1" })
        const p2 = makeProject({ name: "Project 2", path: "/p2" })
        yield* repo.save(p1)
        yield* repo.save(p2)
        const all = yield* repo.findAll()
        expect(all).toHaveLength(2)
      }),
    )
  })

  it("findByPath finds by path", async () => {
    await runTest(
      Effect.gen(function* () {
        const repo = yield* ProjectRepository
        const project = makeProject({ path: "/unique/path" })
        yield* repo.save(project)
        const found = yield* repo.findByPath("/unique/path")
        expect(Option.isSome(found)).toBe(true)
        expect(Option.getOrThrow(found).id).toBe(project.id)
      }),
    )
  })

  it("findByPath with unknown returns None", async () => {
    await runTest(
      Effect.gen(function* () {
        const repo = yield* ProjectRepository
        const found = yield* repo.findByPath("/nonexistent")
        expect(Option.isNone(found)).toBe(true)
      }),
    )
  })

  it("findByPath duplicate insert fails with RepositoryError", async () => {
    await runTest(
      Effect.gen(function* () {
        const repo = yield* ProjectRepository
        const p1 = makeProject({ name: "First", path: "/same/path" })
        const p2 = makeProject({ name: "Second", path: "/same/path" })
        yield* repo.save(p1)
        const result = yield* Effect.either(repo.save(p2))
        expect(result._tag).toBe("Left")
        if (result._tag === "Left") {
          expect(result.left).toBeInstanceOf(RepositoryError)
        }
      }),
    )
  })

  it("setActiveProjectId + getActiveProjectId returns id", async () => {
    await runTest(
      Effect.gen(function* () {
        const repo = yield* ProjectRepository
        const project = makeProject()
        yield* repo.save(project)
        yield* repo.setActiveProjectId(project.id)
        const activeId = yield* repo.getActiveProjectId()
        expect(Option.isSome(activeId)).toBe(true)
        expect(Option.getOrThrow(activeId)).toBe(project.id)
      }),
    )
  })

  it("setActiveProjectId overwrites previous", async () => {
    await runTest(
      Effect.gen(function* () {
        const repo = yield* ProjectRepository
        const p1 = makeProject({ name: "P1", path: "/p1" })
        const p2 = makeProject({ name: "P2", path: "/p2" })
        yield* repo.save(p1)
        yield* repo.save(p2)
        yield* repo.setActiveProjectId(p1.id)
        yield* repo.setActiveProjectId(p2.id)
        const activeId = yield* repo.getActiveProjectId()
        expect(Option.getOrThrow(activeId)).toBe(p2.id)
      }),
    )
  })

  it("clearActiveProjectId + getActiveProjectId returns None", async () => {
    await runTest(
      Effect.gen(function* () {
        const repo = yield* ProjectRepository
        const project = makeProject()
        yield* repo.save(project)
        yield* repo.setActiveProjectId(project.id)
        yield* repo.clearActiveProjectId()
        const activeId = yield* repo.getActiveProjectId()
        expect(Option.isNone(activeId)).toBe(true)
      }),
    )
  })
})
