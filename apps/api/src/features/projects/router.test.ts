import { describe, it, expect } from "vitest"
import { Effect, Layer, Option, Scope, Exit } from "effect"
import { HttpRouter, HttpApp } from "@effect/platform"
import { Project } from "./domain/Project"
import { ProjectRepository } from "./domain/ProjectRepository"
import { PathValidationPort } from "./application/PathValidationPort"
import { RenameProjectRepository } from "./application/commands/RenameProject"
import type { ProjectId } from "@storik/shared"
import { projectsRouter } from "./router"

const makeInMemoryRepo = () => {
  const store = new Map<ProjectId, Project>()
  let activeProjectId: ProjectId | null = null

  const repo: ProjectRepository = {
    save: (p) => {
      store.set(p.id, p)
      return Effect.succeed(p)
    },
    findById: (id) => {
      const found = store.get(id)
      return Effect.succeed(found ? Option.some(found) : Option.none())
    },
    findAll: () => Effect.succeed([...store.values()]),
    findByPath: (path) => {
      const found = [...store.values()].find((p) => p.path === path)
      return Effect.succeed(found ? Option.some(found) : Option.none())
    },
    getActiveProjectId: () =>
      Effect.succeed(activeProjectId ? Option.some(activeProjectId) : Option.none()),
    setActiveProjectId: (id) => {
      activeProjectId = id
      return Effect.succeed(undefined)
    },
    clearActiveProjectId: () => {
      activeProjectId = null
      return Effect.succeed(undefined)
    },
  }

  return { repo, store }
}

const makeTestHandler = async () => {
  const { repo, store } = makeInMemoryRepo()

  const layer = Layer.mergeAll(
    Layer.succeed(ProjectRepository, repo),
    Layer.succeed(RenameProjectRepository, { findById: repo.findById, save: repo.save }),
    Layer.succeed(PathValidationPort, {
      validate: (path: string) =>
        Effect.succeed(
          path.startsWith("/")
            ? { valid: true as const }
            : { valid: false as const, reason: "Path must be absolute" }
        ),
    })
  )

  const scope = Effect.runSync(Scope.make())
  const runtime = await Effect.runPromise(Layer.toRuntime(layer).pipe(Scope.extend(scope)))

  const httpApp = Effect.flatten(HttpRouter.toHttpApp(projectsRouter))
  const handler = HttpApp.toWebHandlerRuntime(runtime)(httpApp)

  const dispose = () => Effect.runPromise(Scope.close(scope, Exit.void))

  return { handler, repo, store, dispose }
}

const jsonRequest = (method: string, path: string, body?: unknown) => {
  const url = `http://localhost${path}`
  const init: RequestInit = { method }
  if (body !== undefined) {
    init.headers = { "content-type": "application/json" }
    init.body = JSON.stringify(body)
  }
  return new Request(url, init)
}

describe("projects router", () => {
  describe("POST /project/create", () => {
    it("returns 201 with valid body", async () => {
      const { handler, dispose } = await makeTestHandler()
      try {
        const response = await handler(
          jsonRequest("POST", "/project/create", { name: "Test", path: "/tmp/test" })
        )
        expect(response.status).toBe(201)
        const body = await response.json()
        expect(body.name).toBe("Test")
        expect(body.path).toBe("/tmp/test")
        expect(body.status).toBe("active")
        expect(body.id).toBeTruthy()
      } finally {
        await dispose()
      }
    })

    it("returns 400 with missing path", async () => {
      const { handler, dispose } = await makeTestHandler()
      try {
        const response = await handler(
          jsonRequest("POST", "/project/create", { name: "Test" })
        )
        expect(response.status).toBe(400)
      } finally {
        await dispose()
      }
    })

    it("returns 400 with empty name", async () => {
      const { handler, dispose } = await makeTestHandler()
      try {
        const response = await handler(
          jsonRequest("POST", "/project/create", { name: "   ", path: "/tmp/test" })
        )
        expect(response.status).toBe(400)
      } finally {
        await dispose()
      }
    })

    it("returns 400 for duplicate path", async () => {
      const { handler, repo, dispose } = await makeTestHandler()
      try {
        const project = Project.create({ name: "Existing", path: "/tmp/taken" })
        await Effect.runPromise(repo.save(project))

        const response = await handler(
          jsonRequest("POST", "/project/create", { name: "New", path: "/tmp/taken" })
        )
        expect(response.status).toBe(400)
        const body = await response.json()
        expect(body.error).toBe("duplicate_path")
      } finally {
        await dispose()
      }
    })
  })

  describe("POST /project/rename", () => {
    it("returns 404 for unknown project id", async () => {
      const { handler, dispose } = await makeTestHandler()
      try {
        const response = await handler(
          jsonRequest("POST", "/project/rename", { id: "nonexistent-id", newName: "New Name" })
        )
        expect(response.status).toBe(404)
        const body = await response.json()
        expect(body.error).toBe("not_found")
      } finally {
        await dispose()
      }
    })

    it("renames an existing project", async () => {
      const { handler, repo, dispose } = await makeTestHandler()
      try {
        const project = Project.create({ name: "Old Name", path: "/tmp/rename" })
        await Effect.runPromise(repo.save(project))

        const response = await handler(
          jsonRequest("POST", "/project/rename", { id: project.id, newName: "New Name" })
        )
        expect(response.status).toBe(200)
        const body = await response.json()
        expect(body.name).toBe("New Name")
      } finally {
        await dispose()
      }
    })
  })

  describe("POST /project/select", () => {
    it("returns 404 for unknown project id", async () => {
      const { handler, dispose } = await makeTestHandler()
      try {
        const response = await handler(
          jsonRequest("POST", "/project/select", { id: "nonexistent-id" })
        )
        expect(response.status).toBe(404)
        const body = await response.json()
        expect(body.error).toBe("not_found")
      } finally {
        await dispose()
      }
    })

    it("selects an active project", async () => {
      const { handler, repo, dispose } = await makeTestHandler()
      try {
        const project = Project.create({ name: "Test", path: "/tmp/select" })
        await Effect.runPromise(repo.save(project))

        const response = await handler(
          jsonRequest("POST", "/project/select", { id: project.id })
        )
        expect(response.status).toBe(200)
        const body = await response.json()
        expect(body.status).toBe("selected")
      } finally {
        await dispose()
      }
    })
  })

  describe("POST /project/archive", () => {
    it("returns 404 for unknown project id", async () => {
      const { handler, dispose } = await makeTestHandler()
      try {
        const response = await handler(
          jsonRequest("POST", "/project/archive", { id: "nonexistent-id" })
        )
        expect(response.status).toBe(404)
        const body = await response.json()
        expect(body.error).toBe("not_found")
      } finally {
        await dispose()
      }
    })

    it("archives an active project", async () => {
      const { handler, repo, dispose } = await makeTestHandler()
      try {
        const project = Project.create({ name: "Test", path: "/tmp/archive" })
        await Effect.runPromise(repo.save(project))

        const response = await handler(
          jsonRequest("POST", "/project/archive", { id: project.id })
        )
        expect(response.status).toBe(200)
        const body = await response.json()
        expect(body.status).toBe("archived")
      } finally {
        await dispose()
      }
    })

    it("returns 400 when archiving already archived project", async () => {
      const { handler, repo, dispose } = await makeTestHandler()
      try {
        const project = Project.create({ name: "Test", path: "/tmp/archive2" })
        const archived = project.archive()
        await Effect.runPromise(repo.save(archived))

        const response = await handler(
          jsonRequest("POST", "/project/archive", { id: archived.id })
        )
        expect(response.status).toBe(400)
        const body = await response.json()
        expect(body.error).toBe("already_archived")
      } finally {
        await dispose()
      }
    })
  })

  describe("POST /project/restore", () => {
    it("returns 404 for unknown project id", async () => {
      const { handler, dispose } = await makeTestHandler()
      try {
        const response = await handler(
          jsonRequest("POST", "/project/restore", { id: "nonexistent-id" })
        )
        expect(response.status).toBe(404)
        const body = await response.json()
        expect(body.error).toBe("not_found")
      } finally {
        await dispose()
      }
    })

    it("returns 400 when restoring already active project", async () => {
      const { handler, repo, dispose } = await makeTestHandler()
      try {
        const project = Project.create({ name: "Test", path: "/tmp/restore" })
        await Effect.runPromise(repo.save(project))

        const response = await handler(
          jsonRequest("POST", "/project/restore", { id: project.id })
        )
        expect(response.status).toBe(400)
        const body = await response.json()
        expect(body.error).toBe("already_active")
      } finally {
        await dispose()
      }
    })

    it("restores an archived project", async () => {
      const { handler, repo, dispose } = await makeTestHandler()
      try {
        const project = Project.create({ name: "Test", path: "/tmp/restore2" })
        const archived = project.archive()
        await Effect.runPromise(repo.save(archived))

        const response = await handler(
          jsonRequest("POST", "/project/restore", { id: archived.id })
        )
        expect(response.status).toBe(200)
        const body = await response.json()
        expect(body.status).toBe("active")
      } finally {
        await dispose()
      }
    })
  })

  describe("GET /project/list", () => {
    it("returns 200 with empty array when no projects", async () => {
      const { handler, dispose } = await makeTestHandler()
      try {
        const response = await handler(jsonRequest("GET", "/project/list"))
        expect(response.status).toBe(200)
        const body = await response.json()
        expect(body).toEqual([])
      } finally {
        await dispose()
      }
    })

    it("returns only active projects", async () => {
      const { handler, repo, dispose } = await makeTestHandler()
      try {
        const p1 = Project.create({ name: "Active", path: "/tmp/active" })
        const p2 = Project.create({ name: "Archived", path: "/tmp/archived" })
        await Effect.runPromise(repo.save(p1))
        await Effect.runPromise(repo.save(p2.archive()))

        const response = await handler(jsonRequest("GET", "/project/list"))
        expect(response.status).toBe(200)
        const body = await response.json()
        expect(body).toHaveLength(1)
        expect(body[0].name).toBe("Active")
      } finally {
        await dispose()
      }
    })
  })

  describe("GET /project/list-archived", () => {
    it("returns only archived projects", async () => {
      const { handler, repo, dispose } = await makeTestHandler()
      try {
        const p1 = Project.create({ name: "Active", path: "/tmp/active" })
        const p2 = Project.create({ name: "Archived", path: "/tmp/archived" })
        await Effect.runPromise(repo.save(p1))
        await Effect.runPromise(repo.save(p2.archive()))

        const response = await handler(jsonRequest("GET", "/project/list-archived"))
        expect(response.status).toBe(200)
        const body = await response.json()
        expect(body).toHaveLength(1)
        expect(body[0].name).toBe("Archived")
      } finally {
        await dispose()
      }
    })
  })

  describe("GET /project/active", () => {
    it("returns onboarding-required when no active project", async () => {
      const { handler, dispose } = await makeTestHandler()
      try {
        const response = await handler(jsonRequest("GET", "/project/active"))
        expect(response.status).toBe(200)
        const body = await response.json()
        expect(body.status).toBe("onboarding-required")
      } finally {
        await dispose()
      }
    })
  })
})
