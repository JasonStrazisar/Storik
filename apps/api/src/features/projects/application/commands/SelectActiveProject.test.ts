import { describe, it, expect } from "vitest"
import { Effect, Layer, Option } from "effect"
import * as Schema from "effect/Schema"
import { Project } from "../../domain/Project"
import { ProjectRepository } from "../../domain/ProjectRepository"
import { ProjectNotFoundError } from "../../domain/Project.errors"
import type { ProjectId } from "@storik/shared"
import { handleSelectActiveProject } from "./SelectActiveProject"
import { handleGetActiveProject } from "../queries/GetActiveProject"

const makeProjectId = (s: string) => Schema.decodeSync(Schema.NonEmptyString.pipe(Schema.brand("ProjectId")))(s) as ProjectId

const makeInMemoryRepo = (): ProjectRepository & { _activeId: ProjectId | null } => {
  const store = new Map<ProjectId, Project>()
  const state = {
    _activeId: null as ProjectId | null,
    save: (p: Project) => {
      store.set(p.id, p)
      return Effect.succeed(p)
    },
    findById: (id: ProjectId) => {
      const found = store.get(id)
      return Effect.succeed(found ? Option.some(found) : Option.none())
    },
    findAll: () => Effect.succeed([...store.values()]),
    findByPath: (path: string) => {
      const found = [...store.values()].find((p) => p.path === path)
      return Effect.succeed(found ? Option.some(found) : Option.none())
    },
    getActiveProjectId: () =>
      Effect.succeed(state._activeId ? Option.some(state._activeId) : Option.none()),
    setActiveProjectId: (id: ProjectId) => {
      state._activeId = id
      return Effect.succeed(undefined as void)
    },
    clearActiveProjectId: () => {
      state._activeId = null
      return Effect.succeed(undefined as void)
    },
  }
  return state
}

describe("handleSelectActiveProject", () => {
  it("selects an active project -> status 'selected'", async () => {
    const repo = makeInMemoryRepo()
    const project = Project.create({ name: "Active", path: "/tmp/active" })
    await Effect.runPromise(repo.save(project))

    const layer = Layer.succeed(ProjectRepository, repo)
    const result = await Effect.runPromise(
      handleSelectActiveProject({ projectId: project.id }).pipe(Effect.provide(layer))
    )

    expect(result.status).toBe("selected")
    expect(result).toHaveProperty("project")
    if (result.status === "selected") {
      expect(result.project.id).toBe(project.id)
    }
    expect(repo._activeId).toBe(project.id)
  })

  it("selects an archived project with active alternatives -> status 'fallback'", async () => {
    const repo = makeInMemoryRepo()
    const archived = Project.create({ name: "Archived", path: "/tmp/archived" }).archive()
    const active = Project.create({ name: "Active", path: "/tmp/active" })
    await Effect.runPromise(repo.save(archived))
    await Effect.runPromise(repo.save(active))

    const layer = Layer.succeed(ProjectRepository, repo)
    const result = await Effect.runPromise(
      handleSelectActiveProject({ projectId: archived.id }).pipe(Effect.provide(layer))
    )

    expect(result.status).toBe("fallback")
    if (result.status === "fallback") {
      expect(result.project.id).toBe(active.id)
    }
    expect(repo._activeId).toBe(active.id)
  })

  it("selects an archived project with no active alternatives -> status 'onboarding-required'", async () => {
    const repo = makeInMemoryRepo()
    const archived = Project.create({ name: "Archived", path: "/tmp/archived" }).archive()
    await Effect.runPromise(repo.save(archived))

    const layer = Layer.succeed(ProjectRepository, repo)
    const result = await Effect.runPromise(
      handleSelectActiveProject({ projectId: archived.id }).pipe(Effect.provide(layer))
    )

    expect(result.status).toBe("onboarding-required")
    expect(repo._activeId).toBeNull()
  })

  it("selects unknown project -> ProjectNotFoundError", async () => {
    const repo = makeInMemoryRepo()
    const layer = Layer.succeed(ProjectRepository, repo)
    const unknownId = makeProjectId("unknown-id")

    const result = await Effect.runPromise(
      Effect.either(
        handleSelectActiveProject({ projectId: unknownId }).pipe(Effect.provide(layer))
      )
    )

    expect(result._tag).toBe("Left")
    if (result._tag === "Left") {
      expect(result.left).toBeInstanceOf(ProjectNotFoundError)
    }
  })
})

describe("handleGetActiveProject", () => {
  it("no active project set -> status 'onboarding-required'", async () => {
    const repo = makeInMemoryRepo()
    const layer = Layer.succeed(ProjectRepository, repo)

    const result = await Effect.runPromise(
      handleGetActiveProject().pipe(Effect.provide(layer))
    )

    expect(result.status).toBe("onboarding-required")
  })

  it("active id set to valid active project -> status 'active'", async () => {
    const repo = makeInMemoryRepo()
    const project = Project.create({ name: "Active", path: "/tmp/active" })
    await Effect.runPromise(repo.save(project))
    repo._activeId = project.id

    const layer = Layer.succeed(ProjectRepository, repo)
    const result = await Effect.runPromise(
      handleGetActiveProject().pipe(Effect.provide(layer))
    )

    expect(result.status).toBe("active")
    if (result.status === "active") {
      expect(result.project.id).toBe(project.id)
    }
  })

  it("active id set to archived project -> status 'onboarding-required'", async () => {
    const repo = makeInMemoryRepo()
    const project = Project.create({ name: "Archived", path: "/tmp/archived" }).archive()
    await Effect.runPromise(repo.save(project))
    repo._activeId = project.id

    const layer = Layer.succeed(ProjectRepository, repo)
    const result = await Effect.runPromise(
      handleGetActiveProject().pipe(Effect.provide(layer))
    )

    expect(result.status).toBe("onboarding-required")
    expect(repo._activeId).toBeNull()
  })

  it("active id set to deleted project (missing) -> status 'onboarding-required'", async () => {
    const repo = makeInMemoryRepo()
    repo._activeId = makeProjectId("deleted-id")

    const layer = Layer.succeed(ProjectRepository, repo)
    const result = await Effect.runPromise(
      handleGetActiveProject().pipe(Effect.provide(layer))
    )

    expect(result.status).toBe("onboarding-required")
    expect(repo._activeId).toBeNull()
  })
})
