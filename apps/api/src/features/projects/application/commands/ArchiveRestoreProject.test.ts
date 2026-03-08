import { describe, it, expect } from "vitest"
import { Effect, Layer, Option } from "effect"
import { Project } from "../../domain/Project"
import { ProjectRepository } from "../../domain/ProjectRepository"
import type { ProjectId } from "@storik/shared"
import { handleArchiveProject } from "./ArchiveProject"
import { handleRestoreProject } from "./RestoreProject"

const makeInMemoryRepo = () => {
  const store = new Map<ProjectId, Project>()
  let activeProjectId: ProjectId | null = null

  const repo: ProjectRepository = {
    save: (p) => {
      store.set(p.id, p)
      return Effect.succeed(p)
    },
    findById: (id) => Effect.succeed(
      store.has(id) ? Option.some(store.get(id)!) : Option.none()
    ),
    findAll: () => Effect.succeed([...store.values()]),
    findByPath: (path) => Effect.succeed(
      Option.fromNullable([...store.values()].find(p => p.path === path))
    ),
    getActiveProjectId: () => Effect.succeed(
      activeProjectId ? Option.some(activeProjectId) : Option.none()
    ),
    setActiveProjectId: (id) => {
      activeProjectId = id
      return Effect.succeed(undefined)
    },
    clearActiveProjectId: () => {
      activeProjectId = null
      return Effect.succeed(undefined)
    },
  }

  return { repo, store, getActiveId: () => activeProjectId, setActiveId: (id: ProjectId | null) => { activeProjectId = id } }
}

describe("handleArchiveProject", () => {
  it("archive active project → returns archived, active cleared", async () => {
    const { repo, store, setActiveId } = makeInMemoryRepo()
    const project = Project.create({ name: "Test", path: "/tmp/test" })
    store.set(project.id, project)
    setActiveId(project.id)

    const result = await Effect.runPromise(
      handleArchiveProject({ projectId: project.id }).pipe(
        Effect.provide(Layer.succeed(ProjectRepository, repo))
      )
    )

    expect(result.status).toBe("archived")
    expect(result.id).toBe(project.id)
    // active should have been cleared
    const activeId = await Effect.runPromise(
      repo.getActiveProjectId()
    )
    expect(Option.isNone(activeId)).toBe(true)
  })

  it("archive non-active project → active NOT cleared", async () => {
    const { repo, store, setActiveId, getActiveId } = makeInMemoryRepo()
    const project = Project.create({ name: "Test", path: "/tmp/test" })
    const otherProject = Project.create({ name: "Other", path: "/tmp/other" })
    store.set(project.id, project)
    store.set(otherProject.id, otherProject)
    setActiveId(otherProject.id)

    await Effect.runPromise(
      handleArchiveProject({ projectId: project.id }).pipe(
        Effect.provide(Layer.succeed(ProjectRepository, repo))
      )
    )

    expect(getActiveId()).toBe(otherProject.id)
  })

  it("archive archived project → ProjectAlreadyArchivedError", async () => {
    const { repo, store } = makeInMemoryRepo()
    const project = Project.create({ name: "Test", path: "/tmp/test" })
    const archived = project.archive()
    store.set(archived.id, archived)

    const result = await Effect.runPromise(
      handleArchiveProject({ projectId: archived.id }).pipe(
        Effect.either,
        Effect.provide(Layer.succeed(ProjectRepository, repo))
      )
    )

    expect(result._tag).toBe("Left")
    if (result._tag === "Left") {
      expect(result.left._tag).toBe("ProjectAlreadyArchivedError")
    }
  })

  it("archive unknown id → ProjectNotFoundError", async () => {
    const { repo } = makeInMemoryRepo()

    const result = await Effect.runPromise(
      handleArchiveProject({ projectId: "nonexistent" as ProjectId }).pipe(
        Effect.either,
        Effect.provide(Layer.succeed(ProjectRepository, repo))
      )
    )

    expect(result._tag).toBe("Left")
    if (result._tag === "Left") {
      expect(result.left._tag).toBe("ProjectNotFoundError")
    }
  })
})

describe("handleRestoreProject", () => {
  it("restore archived project → returns active", async () => {
    const { repo, store } = makeInMemoryRepo()
    const project = Project.create({ name: "Test", path: "/tmp/test" })
    const archived = project.archive()
    store.set(archived.id, archived)

    const result = await Effect.runPromise(
      handleRestoreProject({ projectId: archived.id }).pipe(
        Effect.provide(Layer.succeed(ProjectRepository, repo))
      )
    )

    expect(result.status).toBe("active")
    expect(result.id).toBe(archived.id)
  })

  it("restore active project → ProjectAlreadyActiveError", async () => {
    const { repo, store } = makeInMemoryRepo()
    const project = Project.create({ name: "Test", path: "/tmp/test" })
    store.set(project.id, project)

    const result = await Effect.runPromise(
      handleRestoreProject({ projectId: project.id }).pipe(
        Effect.either,
        Effect.provide(Layer.succeed(ProjectRepository, repo))
      )
    )

    expect(result._tag).toBe("Left")
    if (result._tag === "Left") {
      expect(result.left._tag).toBe("ProjectAlreadyActiveError")
    }
  })

  it("restore unknown id → ProjectNotFoundError", async () => {
    const { repo } = makeInMemoryRepo()

    const result = await Effect.runPromise(
      handleRestoreProject({ projectId: "nonexistent" as ProjectId }).pipe(
        Effect.either,
        Effect.provide(Layer.succeed(ProjectRepository, repo))
      )
    )

    expect(result._tag).toBe("Left")
    if (result._tag === "Left") {
      expect(result.left._tag).toBe("ProjectNotFoundError")
    }
  })
})
