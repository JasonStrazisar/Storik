import { describe, it, expect } from "vitest"
import { Effect, Layer, Option } from "effect"
import { Project } from "../../domain/Project"
import { ProjectRepository } from "../../domain/ProjectRepository"
import { PathValidationPort } from "../PathValidationPort"
import type { ProjectId } from "@storik/shared"
import { handleCreateProject } from "./CreateProject"
import { RepositoryError, ProjectNameInvalidError } from "../../domain/Project.errors"
import { DuplicatePathError, PathValidationError } from "../errors/ProjectCommandError"

const makeInMemoryRepo = (): ProjectRepository => {
  const store = new Map<ProjectId, Project>()
  return {
    save: (p) => {
      store.set(p.id, p)
      return Effect.succeed(p)
    },
    findById: (_id) => Effect.succeed(Option.none()),
    findAll: () => Effect.succeed([...store.values()]),
    findByPath: (path) => {
      const found = [...store.values()].find((p) => p.path === path)
      return Effect.succeed(found ? Option.some(found) : Option.none())
    },
    getActiveProjectId: () => Effect.succeed(Option.none()),
    setActiveProjectId: (_id) => Effect.succeed(undefined),
    clearActiveProjectId: () => Effect.succeed(undefined),
  }
}

const makeValidPathValidator = (): PathValidationPort => ({
  validate: (_path) => Effect.succeed({ valid: true as const }),
})

const makeInvalidPathValidator = (reason: string): PathValidationPort => ({
  validate: (_path) => Effect.succeed({ valid: false as const, reason }),
})

const makeTestLayer = () =>
  Layer.mergeAll(
    Layer.succeed(ProjectRepository, makeInMemoryRepo()),
    Layer.succeed(PathValidationPort, makeValidPathValidator())
  )

describe("handleCreateProject", () => {
  it("valid name and path returns Project with status active", async () => {
    const result = await Effect.runPromise(
      handleCreateProject({ name: "My Project", path: "/tmp/my-project" }).pipe(
        Effect.provide(makeTestLayer())
      )
    )

    expect(result).toBeInstanceOf(Project)
    expect(result.status).toBe("active")
  })

  it("returned project has non-empty id", async () => {
    const result = await Effect.runPromise(
      handleCreateProject({ name: "My Project", path: "/tmp/my-project" }).pipe(
        Effect.provide(makeTestLayer())
      )
    )

    expect(result.id).toBeTruthy()
    expect(typeof result.id).toBe("string")
    expect(result.id.length).toBeGreaterThan(0)
  })

  it("name and path match input", async () => {
    const result = await Effect.runPromise(
      handleCreateProject({ name: "Test Project", path: "/home/user/code" }).pipe(
        Effect.provide(makeTestLayer())
      )
    )

    expect(result.name).toBe("Test Project")
    expect(result.path).toBe("/home/user/code")
  })

  it("createdAt and updatedAt are ISO 8601 formatted strings", async () => {
    const result = await Effect.runPromise(
      handleCreateProject({ name: "My Project", path: "/tmp/my-project" }).pipe(
        Effect.provide(makeTestLayer())
      )
    )

    const isoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/
    expect(result.createdAt).toMatch(isoPattern)
    expect(result.updatedAt).toMatch(isoPattern)
  })

  describe("error paths", () => {
    it("fails with PathValidationError when validator returns invalid", async () => {
      const layer = Layer.mergeAll(
        Layer.succeed(ProjectRepository, makeInMemoryRepo()),
        Layer.succeed(PathValidationPort, makeInvalidPathValidator("not absolute"))
      )

      const result = await Effect.runPromise(
        Effect.either(
          handleCreateProject({ name: "My Project", path: "relative/path" }).pipe(
            Effect.provide(layer)
          )
        )
      )

      expect(result._tag).toBe("Left")
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(PathValidationError)
        expect((result.left as PathValidationError).path).toBe("relative/path")
        expect((result.left as PathValidationError).reason).toBe("not absolute")
      }
    })

    it("fails with DuplicatePathError when path already exists", async () => {
      const repo = makeInMemoryRepo()
      // Pre-populate repo with existing project at that path
      const existing = Project.create({ name: "Existing", path: "/tmp/taken" })
      await Effect.runPromise(repo.save(existing))

      const layer = Layer.mergeAll(
        Layer.succeed(ProjectRepository, repo),
        Layer.succeed(PathValidationPort, makeValidPathValidator())
      )

      const result = await Effect.runPromise(
        Effect.either(
          handleCreateProject({ name: "New Project", path: "/tmp/taken" }).pipe(
            Effect.provide(layer)
          )
        )
      )

      expect(result._tag).toBe("Left")
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(DuplicatePathError)
        expect((result.left as DuplicatePathError).path).toBe("/tmp/taken")
      }
    })

    it("fails with ProjectNameInvalidError when name is empty", async () => {
      const result = await Effect.runPromise(
        Effect.either(
          handleCreateProject({ name: "", path: "/tmp/project" }).pipe(
            Effect.provide(makeTestLayer())
          )
        )
      )

      expect(result._tag).toBe("Left")
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(ProjectNameInvalidError)
      }
    })

    it("fails with ProjectNameInvalidError when name exceeds 80 chars", async () => {
      const longName = "a".repeat(81)
      const result = await Effect.runPromise(
        Effect.either(
          handleCreateProject({ name: longName, path: "/tmp/project" }).pipe(
            Effect.provide(makeTestLayer())
          )
        )
      )

      expect(result._tag).toBe("Left")
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(ProjectNameInvalidError)
      }
    })
  })
})
