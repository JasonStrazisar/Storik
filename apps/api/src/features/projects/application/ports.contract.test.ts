import { describe, it, expect, beforeEach } from "vitest"
import { Effect, Option } from "effect"
import { Project } from "../domain/Project"
import { RepositoryError } from "../domain/Project.errors"
import { ProjectRepository } from "../domain/ProjectRepository"
import type { ProjectId } from "@storik/shared"

class InMemoryProjectRepository implements ProjectRepository {
  private store = new Map<string, Project>()
  private activeId: ProjectId | undefined

  save(project: Project): Effect.Effect<Project, RepositoryError> {
    this.store.set(project.id, project)
    return Effect.succeed(project)
  }

  findById(id: ProjectId): Effect.Effect<Option.Option<Project>, RepositoryError> {
    const p = this.store.get(id)
    return Effect.succeed(p ? Option.some(p) : Option.none())
  }

  findAll(): Effect.Effect<Project[], RepositoryError> {
    return Effect.succeed(Array.from(this.store.values()))
  }

  findByPath(path: string): Effect.Effect<Option.Option<Project>, RepositoryError> {
    const found = Array.from(this.store.values()).find(p => p.path === path)
    return Effect.succeed(found ? Option.some(found) : Option.none())
  }

  getActiveProjectId(): Effect.Effect<Option.Option<ProjectId>, RepositoryError> {
    return Effect.succeed(this.activeId ? Option.some(this.activeId) : Option.none())
  }

  setActiveProjectId(id: ProjectId): Effect.Effect<void, RepositoryError> {
    this.activeId = id
    return Effect.succeed(undefined)
  }

  clearActiveProjectId(): Effect.Effect<void, RepositoryError> {
    this.activeId = undefined
    return Effect.succeed(undefined)
  }
}

describe("ProjectRepository contract (InMemory)", () => {
  let repo: InMemoryProjectRepository

  beforeEach(() => {
    repo = new InMemoryProjectRepository()
  })

  it("save + findById returns the saved project", async () => {
    const project = Project.create({ name: "Test Project", path: "/home/user/test" })
    await Effect.runPromise(repo.save(project))
    const result = await Effect.runPromise(repo.findById(project.id))
    expect(Option.isSome(result)).toBe(true)
    if (Option.isSome(result)) {
      expect(result.value.id).toBe(project.id)
      expect(result.value.name).toBe(project.name)
      expect(result.value.path).toBe(project.path)
    }
  })

  it("findById with unknown id returns Option.none()", async () => {
    const result = await Effect.runPromise(repo.findById("nonexistent-id" as ProjectId))
    expect(Option.isNone(result)).toBe(true)
  })

  it("findAll includes saved projects", async () => {
    const project1 = Project.create({ name: "Project One", path: "/home/user/project1" })
    const project2 = Project.create({ name: "Project Two", path: "/home/user/project2" })
    await Effect.runPromise(repo.save(project1))
    await Effect.runPromise(repo.save(project2))
    const all = await Effect.runPromise(repo.findAll())
    expect(all).toHaveLength(2)
    const ids = all.map(p => p.id)
    expect(ids).toContain(project1.id)
    expect(ids).toContain(project2.id)
  })

  it("findByPath finds a project by its path", async () => {
    const project = Project.create({ name: "My Project", path: "/home/user/my-project" })
    await Effect.runPromise(repo.save(project))
    const result = await Effect.runPromise(repo.findByPath("/home/user/my-project"))
    expect(Option.isSome(result)).toBe(true)
    if (Option.isSome(result)) {
      expect(result.value.id).toBe(project.id)
    }
  })

  it("findByPath with unknown path returns Option.none()", async () => {
    const result = await Effect.runPromise(repo.findByPath("/home/user/nonexistent"))
    expect(Option.isNone(result)).toBe(true)
  })

  it("setActiveProjectId + getActiveProjectId returns the set id", async () => {
    const project = Project.create({ name: "Active Project", path: "/home/user/active" })
    await Effect.runPromise(repo.save(project))
    await Effect.runPromise(repo.setActiveProjectId(project.id))
    const result = await Effect.runPromise(repo.getActiveProjectId())
    expect(Option.isSome(result)).toBe(true)
    if (Option.isSome(result)) {
      expect(result.value).toBe(project.id)
    }
  })

  it("clearActiveProjectId + getActiveProjectId returns Option.none()", async () => {
    const project = Project.create({ name: "Active Project", path: "/home/user/active" })
    await Effect.runPromise(repo.save(project))
    await Effect.runPromise(repo.setActiveProjectId(project.id))
    await Effect.runPromise(repo.clearActiveProjectId())
    const result = await Effect.runPromise(repo.getActiveProjectId())
    expect(Option.isNone(result)).toBe(true)
  })
})
