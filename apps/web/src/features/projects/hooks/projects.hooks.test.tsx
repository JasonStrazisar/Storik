import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { useCreateProject, useSelectProject } from "./useProjectMutations"
import { useProjectList, useActiveProject } from "./useProjectQueries"

const listProjectsMock = vi.fn()
const getActiveProjectMock = vi.fn()
const createProjectMock = vi.fn()
const selectActiveProjectMock = vi.fn()

vi.mock("../infrastructure/desktopClient", () => ({
  desktopClient: {
    listProjects: () => listProjectsMock(),
    getActiveProject: () => getActiveProjectMock(),
    createProject: (payload: unknown) => createProjectMock(payload),
    selectActiveProject: (payload: unknown) => selectActiveProjectMock(payload),
    archiveProject: vi.fn(),
    restoreProject: vi.fn(),
    renameProject: vi.fn(),
    listArchivedProjects: vi.fn(),
  },
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return {
    queryClient,
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("useCreateProject", () => {
  it("calls desktop create command with payload", async () => {
    createProjectMock.mockResolvedValueOnce({ id: "p1", name: "My Project" })

    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useCreateProject(), { wrapper })

    result.current.mutate({ name: "My Project", path: "/tmp/proj" })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(createProjectMock).toHaveBeenCalledWith({
      name: "My Project",
      path: "/tmp/proj",
    })
  })

  it("invalidates queries on success", async () => {
    createProjectMock.mockResolvedValueOnce({ id: "p1" })

    const { wrapper, queryClient } = createWrapper()
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")
    const { result } = renderHook(() => useCreateProject(), { wrapper })

    result.current.mutate({ name: "Test", path: "/tmp/test" })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["projects"] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["activeProject"] })
  })

  it("rejects with error message on failure", async () => {
    createProjectMock.mockRejectedValueOnce(new Error("Name already taken"))

    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useCreateProject(), { wrapper })

    result.current.mutate({ name: "Dup", path: "/tmp/dup" })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error?.message).toBe("Name already taken")
  })
})

describe("useSelectProject", () => {
  it("calls select command", async () => {
    selectActiveProjectMock.mockResolvedValueOnce({ status: "active", project: { id: "proj-1" } })

    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useSelectProject(), { wrapper })

    result.current.mutate({ id: "proj-1" as any })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(selectActiveProjectMock).toHaveBeenCalledWith({ id: "proj-1" })
  })

  it("invalidates active and list queries on success", async () => {
    selectActiveProjectMock.mockResolvedValueOnce({ status: "active", project: { id: "proj-1" } })

    const { wrapper, queryClient } = createWrapper()
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")
    const { result } = renderHook(() => useSelectProject(), { wrapper })

    result.current.mutate({ id: "proj-1" as any })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["activeProject"] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["projects"] })
  })
})

describe("useProjectList", () => {
  it("returns array of projects", async () => {
    const projects = [
      {
        id: "p1",
        name: "Alpha",
        path: "/a",
        status: "active",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      },
    ]
    listProjectsMock.mockResolvedValueOnce(projects)

    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useProjectList(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(projects)
    expect(Array.isArray(result.current.data)).toBe(true)
  })
})

describe("useActiveProject", () => {
  it("returns active project response", async () => {
    const active = {
      status: "active",
      project: {
        id: "p1",
        name: "Main",
        path: "/main",
        status: "active",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      },
    }
    getActiveProjectMock.mockResolvedValueOnce(active)

    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useActiveProject(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(active)
  })

  it("throws when command fails", async () => {
    getActiveProjectMock.mockRejectedValueOnce(new Error("Failed to fetch active project"))

    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useActiveProject(), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error?.message).toBe("Failed to fetch active project")
  })
})
