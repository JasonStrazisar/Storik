import { describe, it, expect } from "vitest"
import { Effect, Layer } from "effect"
import { Project } from "../../domain/Project"
import { ProjectRepository } from "../../domain/ProjectRepository"
import { PathValidationPort } from "../PathValidationPort"
import type { ProjectId } from "@storik/shared"
import { handleCreateProject } from "./CreateProject"
import { RepositoryError } from "../../domain/Project.errors"

const makeInMemoryRepo = (): ProjectRepository => {
  const store = new Map<ProjectId, Project>()
  return {
    save: (p) => {
      store.set(p.id, p)
      return Effect.succeed(p)
    },
    findById: (_id) => Effect.succeed(null as any),
    findAll: () => Effect.succeed([...store.values()]),
    findByPath: (_path) => Effect.succeed(null as any),
    getActiveProjectId: () => Effect.succeed(null as any),
    setActiveProjectId: (_id) => Effect.succeed(undefined),
    clearActiveProjectId: () => Effect.succeed(undefined),
  }
}

const makeValidPathValidator = (): PathValidationPort => ({
  validate: (_path) => Effect.succeed({ valid: true as const }),
})

const TestLayer = Layer.mergeAll(
  Layer.succeed(ProjectRepository, makeInMemoryRepo()),
  Layer.succeed(PathValidationPort, makeValidPathValidator())
)

describe("handleCreateProject", () => {
  it("valid name and path returns Project with status active", async () => {
    const result = await Effect.runPromise(
      handleCreateProject({ name: "My Project", path: "/tmp/my-project" }).pipe(
        Effect.provide(TestLayer)
      )
    )

    expect(result).toBeInstanceOf(Project)
    expect(result.status).toBe("active")
  })

  it("returned project has non-empty id", async () => {
    const result = await Effect.runPromise(
      handleCreateProject({ name: "My Project", path: "/tmp/my-project" }).pipe(
        Effect.provide(TestLayer)
      )
    )

    expect(result.id).toBeTruthy()
    expect(typeof result.id).toBe("string")
    expect(result.id.length).toBeGreaterThan(0)
  })

  it("name and path match input", async () => {
    const result = await Effect.runPromise(
      handleCreateProject({ name: "Test Project", path: "/home/user/code" }).pipe(
        Effect.provide(TestLayer)
      )
    )

    expect(result.name).toBe("Test Project")
    expect(result.path).toBe("/home/user/code")
  })

  it("createdAt and updatedAt are ISO 8601 formatted strings", async () => {
    const result = await Effect.runPromise(
      handleCreateProject({ name: "My Project", path: "/tmp/my-project" }).pipe(
        Effect.provide(TestLayer)
      )
    )

    const isoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/
    expect(result.createdAt).toMatch(isoPattern)
    expect(result.updatedAt).toMatch(isoPattern)
  })
})
