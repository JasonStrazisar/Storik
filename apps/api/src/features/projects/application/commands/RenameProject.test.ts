import { describe, it, expect } from "vitest"
import { Effect, Option, Layer } from "effect"
import * as Schema from "effect/Schema"
import { ProjectId } from "@storik/shared"
import { Project } from "../../domain/Project"
import { ProjectNotFoundError, ProjectNameInvalidError, RepositoryError } from "../../domain/Project.errors"
import { handleRenameProject, RenameProjectRepository } from "./RenameProject"

// Helper to make a ProjectId from a UUID string
const makeProjectId = (id: string): ProjectId =>
  Schema.decodeSync(ProjectId)(id)

// Helper to create a project for tests
const makeProject = (name: string): Project =>
  Project.create({ name, path: "/tmp/test-project" })

const makeTestId = () => makeProjectId(crypto.randomUUID())

describe("handleRenameProject", () => {
  it("happy path: saves and returns project with new name", async () => {
    const project = makeProject("Old Name")
    const store = new Map<ProjectId, Project>([[project.id, project]])

    const fakeRepo: RenameProjectRepository = {
      findById: (id) => Effect.succeed(Option.fromNullable(store.get(id))),
      save: (p) => {
        store.set(p.id, p)
        return Effect.succeed(p)
      },
    }

    const result = await Effect.runPromise(
      handleRenameProject({ projectId: project.id, newName: "New Name" }).pipe(
        Effect.provide(Layer.succeed(RenameProjectRepository, fakeRepo))
      )
    )

    expect(result.name).toBe("New Name")
    expect(result.id).toBe(project.id)
  })

  it("project not found: fails with ProjectNotFoundError", async () => {
    const missingId = makeTestId()

    const fakeRepo: RenameProjectRepository = {
      findById: (_id) => Effect.succeed(Option.none()),
      save: (p) => Effect.succeed(p),
    }

    const result = await Effect.runPromise(
      handleRenameProject({ projectId: missingId, newName: "Whatever" }).pipe(
        Effect.provide(Layer.succeed(RenameProjectRepository, fakeRepo)),
        Effect.either
      )
    )

    expect(result._tag).toBe("Left")
    if (result._tag === "Left") {
      expect(result.left).toBeInstanceOf(ProjectNotFoundError)
      expect((result.left as ProjectNotFoundError).id).toBe(missingId)
    }
  })

  it("empty name: fails with ProjectNameInvalidError", async () => {
    const project = makeProject("Valid Name")
    const store = new Map<ProjectId, Project>([[project.id, project]])

    const fakeRepo: RenameProjectRepository = {
      findById: (id) => Effect.succeed(Option.fromNullable(store.get(id))),
      save: (p) => Effect.succeed(p),
    }

    const result = await Effect.runPromise(
      handleRenameProject({ projectId: project.id, newName: "" }).pipe(
        Effect.provide(Layer.succeed(RenameProjectRepository, fakeRepo)),
        Effect.either
      )
    )

    expect(result._tag).toBe("Left")
    if (result._tag === "Left") {
      expect(result.left).toBeInstanceOf(ProjectNameInvalidError)
    }
  })

  it("81-char name: fails with ProjectNameInvalidError", async () => {
    const project = makeProject("Valid Name")
    const store = new Map<ProjectId, Project>([[project.id, project]])

    const fakeRepo: RenameProjectRepository = {
      findById: (id) => Effect.succeed(Option.fromNullable(store.get(id))),
      save: (p) => Effect.succeed(p),
    }

    const longName = "a".repeat(81)

    const result = await Effect.runPromise(
      handleRenameProject({ projectId: project.id, newName: longName }).pipe(
        Effect.provide(Layer.succeed(RenameProjectRepository, fakeRepo)),
        Effect.either
      )
    )

    expect(result._tag).toBe("Left")
    if (result._tag === "Left") {
      expect(result.left).toBeInstanceOf(ProjectNameInvalidError)
    }
  })

  it('trimmed name "  New  " → saved name is "New"', async () => {
    const project = makeProject("Old Name")
    const store = new Map<ProjectId, Project>([[project.id, project]])

    const fakeRepo: RenameProjectRepository = {
      findById: (id) => Effect.succeed(Option.fromNullable(store.get(id))),
      save: (p) => {
        store.set(p.id, p)
        return Effect.succeed(p)
      },
    }

    const result = await Effect.runPromise(
      handleRenameProject({ projectId: project.id, newName: "  New  " }).pipe(
        Effect.provide(Layer.succeed(RenameProjectRepository, fakeRepo))
      )
    )

    expect(result.name).toBe("New")
  })
})
