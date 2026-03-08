import { describe, it, expect } from "vitest"
import * as Schema from "@effect/schema/Schema"
import * as Either from "effect/Either"
import {
  ProjectId,
  Project,
  ActiveProject,
  CreateProjectPayload,
  SelectProjectPayload,
  RenameProjectPayload,
  ArchiveProjectPayload,
  RestoreProjectPayload,
  ProjectListResponse,
  ProjectActiveListResponse,
} from "./project"

describe("ProjectId", () => {
  it("accepts non-empty string", () => {
    const result = Schema.decodeEither(ProjectId)("project-1")
    expect(Either.isRight(result)).toBe(true)
  })

  it("rejects empty string", () => {
    const result = Schema.decodeEither(ProjectId)("")
    expect(Either.isLeft(result)).toBe(true)
  })
})

describe("Project", () => {
  const validProject = {
    id: "proj-1",
    name: "My Project",
    path: "/home/user/projects/my-project",
    status: "active" as const,
    createdAt: "2026-03-08T10:30:00Z",
    updatedAt: "2026-03-08T10:30:00Z",
  }

  it("accepts valid active project", () => {
    const result = Schema.decodeEither(Project)(validProject)
    expect(Either.isRight(result)).toBe(true)
  })

  it("accepts valid archived project", () => {
    const result = Schema.decodeEither(Project)({
      ...validProject,
      status: "archived",
    })
    expect(Either.isRight(result)).toBe(true)
  })

  it("rejects unknown status", () => {
    const result = Schema.decodeEither(Project)({
      ...validProject,
      status: "pending",
    })
    expect(Either.isLeft(result)).toBe(true)
  })

  it("rejects relative path", () => {
    const result = Schema.decodeEither(Project)({
      ...validProject,
      path: "relative/path",
    })
    expect(Either.isLeft(result)).toBe(true)
  })

  it("rejects missing fields", () => {
    const result = Schema.decodeEither(Project)({
      id: "proj-1",
      name: "My Project",
      // missing path, status, createdAt, updatedAt
    })
    expect(Either.isLeft(result)).toBe(true)
  })

  it("strips extra keys from input", () => {
    const result = Schema.decodeEither(Project)({
      ...validProject,
      extra: "field",
      another: 123,
    })
    expect(Either.isRight(result)).toBe(true)
    if (Either.isRight(result)) {
      expect(result.right).not.toHaveProperty("extra")
      expect(result.right).not.toHaveProperty("another")
    }
  })
})

describe("ActiveProject", () => {
  const validActiveProject = {
    id: "proj-1",
    name: "My Project",
    path: "/home/user/projects/my-project",
    status: "active" as const,
    createdAt: "2026-03-08T10:30:00Z",
    updatedAt: "2026-03-08T10:30:00Z",
  }

  it("accepts valid active-only project", () => {
    const result = Schema.decodeEither(ActiveProject)(validActiveProject)
    expect(Either.isRight(result)).toBe(true)
  })

  it("rejects archived status", () => {
    const result = Schema.decodeEither(ActiveProject)({
      ...validActiveProject,
      status: "archived",
    })
    expect(Either.isLeft(result)).toBe(true)
  })
})

describe("CreateProjectPayload", () => {
  it("accepts valid name and path", () => {
    const result = Schema.decodeEither(CreateProjectPayload)({
      name: "My Project",
      path: "/home/user/projects",
    })
    expect(Either.isRight(result)).toBe(true)
  })

  it("trims whitespace from name", () => {
    const result = Schema.decodeEither(CreateProjectPayload)({
      name: "  Trimmed  ",
      path: "/home/user/projects",
    })
    expect(Either.isRight(result)).toBe(true)
    if (Either.isRight(result)) {
      expect(result.right.name).toBe("Trimmed")
    }
  })

  it("rejects empty name", () => {
    const result = Schema.decodeEither(CreateProjectPayload)({
      name: "",
      path: "/home/user/projects",
    })
    expect(Either.isLeft(result)).toBe(true)
  })

  it("rejects whitespace-only name", () => {
    const result = Schema.decodeEither(CreateProjectPayload)({
      name: "   ",
      path: "/home/user/projects",
    })
    expect(Either.isLeft(result)).toBe(true)
  })

  it("rejects 81-character name", () => {
    const result = Schema.decodeEither(CreateProjectPayload)({
      name: "a".repeat(81),
      path: "/home/user/projects",
    })
    expect(Either.isLeft(result)).toBe(true)
  })

  it("rejects relative path", () => {
    const result = Schema.decodeEither(CreateProjectPayload)({
      name: "My Project",
      path: "relative/path",
    })
    expect(Either.isLeft(result)).toBe(true)
  })
})

describe("SelectProjectPayload", () => {
  it("accepts valid id", () => {
    const result = Schema.decodeEither(SelectProjectPayload)({ id: "proj-1" })
    expect(Either.isRight(result)).toBe(true)
  })

  it("rejects missing id", () => {
    const result = Schema.decodeEither(SelectProjectPayload)({})
    expect(Either.isLeft(result)).toBe(true)
  })
})

describe("RenameProjectPayload", () => {
  it("accepts valid id and newName", () => {
    const result = Schema.decodeEither(RenameProjectPayload)({
      id: "proj-1",
      newName: "Renamed Project",
    })
    expect(Either.isRight(result)).toBe(true)
  })

  it("trims newName whitespace", () => {
    const result = Schema.decodeEither(RenameProjectPayload)({
      id: "proj-1",
      newName: "  Trimmed  ",
    })
    expect(Either.isRight(result)).toBe(true)
    if (Either.isRight(result)) {
      expect(result.right.newName).toBe("Trimmed")
    }
  })

  it("rejects empty newName", () => {
    const result = Schema.decodeEither(RenameProjectPayload)({
      id: "proj-1",
      newName: "",
    })
    expect(Either.isLeft(result)).toBe(true)
  })

  it("rejects 81-character newName", () => {
    const result = Schema.decodeEither(RenameProjectPayload)({
      id: "proj-1",
      newName: "a".repeat(81),
    })
    expect(Either.isLeft(result)).toBe(true)
  })
})

describe("ArchiveProjectPayload", () => {
  it("accepts valid id", () => {
    const result = Schema.decodeEither(ArchiveProjectPayload)({ id: "proj-1" })
    expect(Either.isRight(result)).toBe(true)
  })

  it("rejects missing id", () => {
    const result = Schema.decodeEither(ArchiveProjectPayload)({})
    expect(Either.isLeft(result)).toBe(true)
  })
})

describe("RestoreProjectPayload", () => {
  it("accepts valid id", () => {
    const result = Schema.decodeEither(RestoreProjectPayload)({ id: "proj-1" })
    expect(Either.isRight(result)).toBe(true)
  })

  it("rejects missing id", () => {
    const result = Schema.decodeEither(RestoreProjectPayload)({})
    expect(Either.isLeft(result)).toBe(true)
  })
})

describe("ProjectListResponse", () => {
  it("accepts empty array", () => {
    const result = Schema.decodeEither(ProjectListResponse)([])
    expect(Either.isRight(result)).toBe(true)
  })

  it("accepts mixed-status array", () => {
    const result = Schema.decodeEither(ProjectListResponse)([
      {
        id: "proj-1",
        name: "Active Project",
        path: "/path1",
        status: "active",
        createdAt: "2026-03-08T10:30:00Z",
        updatedAt: "2026-03-08T10:30:00Z",
      },
      {
        id: "proj-2",
        name: "Archived Project",
        path: "/path2",
        status: "archived",
        createdAt: "2026-03-08T10:30:00Z",
        updatedAt: "2026-03-08T10:30:00Z",
      },
    ])
    expect(Either.isRight(result)).toBe(true)
  })

  it("rejects non-array", () => {
    const result = Schema.decodeEither(ProjectListResponse)({
      projects: [],
    })
    expect(Either.isLeft(result)).toBe(true)
  })
})

describe("ProjectActiveListResponse", () => {
  it("accepts active-only array", () => {
    const result = Schema.decodeEither(ProjectActiveListResponse)([
      {
        id: "proj-1",
        name: "Active Project",
        path: "/path1",
        status: "active",
        createdAt: "2026-03-08T10:30:00Z",
        updatedAt: "2026-03-08T10:30:00Z",
      },
    ])
    expect(Either.isRight(result)).toBe(true)
  })

  it("accepts empty array", () => {
    const result = Schema.decodeEither(ProjectActiveListResponse)([])
    expect(Either.isRight(result)).toBe(true)
  })

  it("rejects archived status", () => {
    const result = Schema.decodeEither(ProjectActiveListResponse)([
      {
        id: "proj-2",
        name: "Archived Project",
        path: "/path2",
        status: "archived",
        createdAt: "2026-03-08T10:30:00Z",
        updatedAt: "2026-03-08T10:30:00Z",
      },
    ])
    expect(Either.isLeft(result)).toBe(true)
  })
})
