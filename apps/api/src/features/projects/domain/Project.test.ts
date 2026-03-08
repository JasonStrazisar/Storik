import { describe, it, expect } from "vitest"
import { Project } from "./Project"
import { ProjectNameInvalidError, ProjectAlreadyArchivedError, ProjectAlreadyActiveError } from "./Project.errors"

describe("Project.create", () => {
  it("happy path: returns Project with status 'active', non-empty id, correct name and path", () => {
    const project = Project.create({ name: "My Project", path: "/home/user/my-project" })
    expect(project.status).toBe("active")
    expect(project.id).toBeTruthy()
    expect(project.name).toBe("My Project")
    expect(project.path).toBe("/home/user/my-project")
  })

  it("trims whitespace from name", () => {
    const project = Project.create({ name: "  My Project  ", path: "/home/user/project" })
    expect(project.name).toBe("My Project")
  })

  it("throws ProjectNameInvalidError for empty name", () => {
    expect(() => Project.create({ name: "", path: "/home/user/project" })).toThrow(ProjectNameInvalidError)
  })

  it("throws ProjectNameInvalidError for whitespace-only name", () => {
    expect(() => Project.create({ name: "   ", path: "/home/user/project" })).toThrow(ProjectNameInvalidError)
  })

  it("throws ProjectNameInvalidError for 81-char name", () => {
    const longName = "a".repeat(81)
    expect(() => Project.create({ name: longName, path: "/home/user/project" })).toThrow(ProjectNameInvalidError)
  })

  it("accepts exactly 80-char name", () => {
    const name80 = "a".repeat(80)
    const project = Project.create({ name: name80, path: "/home/user/project" })
    expect(project.name).toBe(name80)
  })

  it("sets createdAt and updatedAt as ISO date strings", () => {
    const project = Project.create({ name: "Test", path: "/home/user/project" })
    expect(project.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    expect(project.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
  })
})

describe("Project.rename", () => {
  it("happy path: returns new Project with new name", () => {
    const project = Project.create({ name: "Old Name", path: "/home/user/project" })
    const renamed = project.rename("New Name")
    expect(renamed.name).toBe("New Name")
  })

  it("returns a new instance (different reference)", () => {
    const project = Project.create({ name: "Old Name", path: "/home/user/project" })
    const renamed = project.rename("New Name")
    expect(renamed).not.toBe(project)
  })

  it("updates updatedAt to a newer or equal timestamp", () => {
    const project = Project.create({ name: "Old Name", path: "/home/user/project" })
    const before = new Date(project.updatedAt).getTime()
    const renamed = project.rename("New Name")
    const after = new Date(renamed.updatedAt).getTime()
    expect(after).toBeGreaterThanOrEqual(before)
  })

  it("throws ProjectNameInvalidError for empty name", () => {
    const project = Project.create({ name: "Valid Name", path: "/home/user/project" })
    expect(() => project.rename("")).toThrow(ProjectNameInvalidError)
  })

  it("path is immutable after rename", () => {
    const project = Project.create({ name: "Old Name", path: "/home/user/project" })
    const renamed = project.rename("New Name")
    expect(renamed.path).toBe(project.path)
  })

  it("id is preserved after rename", () => {
    const project = Project.create({ name: "Old Name", path: "/home/user/project" })
    const renamed = project.rename("New Name")
    expect(renamed.id).toBe(project.id)
  })
})

describe("Project.archive", () => {
  it("sets status to 'archived'", () => {
    const project = Project.create({ name: "My Project", path: "/home/user/project" })
    const archived = project.archive()
    expect(archived.status).toBe("archived")
  })

  it("returns a new instance", () => {
    const project = Project.create({ name: "My Project", path: "/home/user/project" })
    const archived = project.archive()
    expect(archived).not.toBe(project)
  })

  it("throws ProjectAlreadyArchivedError when already archived", () => {
    const project = Project.create({ name: "My Project", path: "/home/user/project" })
    const archived = project.archive()
    expect(() => archived.archive()).toThrow(ProjectAlreadyArchivedError)
  })
})

describe("Project.restore", () => {
  it("restores an archived project to active status", () => {
    const project = Project.create({ name: "My Project", path: "/home/user/project" })
    const archived = project.archive()
    const restored = archived.restore()
    expect(restored.status).toBe("active")
  })

  it("returns a new instance", () => {
    const project = Project.create({ name: "My Project", path: "/home/user/project" })
    const archived = project.archive()
    const restored = archived.restore()
    expect(restored).not.toBe(archived)
  })

  it("throws ProjectAlreadyActiveError when already active", () => {
    const project = Project.create({ name: "My Project", path: "/home/user/project" })
    expect(() => project.restore()).toThrow(ProjectAlreadyActiveError)
  })
})
