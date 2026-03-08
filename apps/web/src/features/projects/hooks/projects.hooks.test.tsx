import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { useCreateProject } from "./useProjectMutations"
import { useSelectProject } from "./useProjectMutations"
import { useProjectList } from "./useProjectQueries"
import { useActiveProject } from "./useProjectQueries"

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

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal("fetch", fetchMock)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("useCreateProject", () => {
  it("calls correct endpoint with payload", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: "p1", name: "My Project" }),
    })

    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useCreateProject(), { wrapper })

    result.current.mutate({ name: "My Project", path: "/tmp/proj" })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(fetchMock).toHaveBeenCalledWith("/api/project/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "My Project", path: "/tmp/proj" }),
    })
  })

  it("invalidates queries on success", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: "p1" }),
    })

    const { wrapper, queryClient } = createWrapper()
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")
    const { result } = renderHook(() => useCreateProject(), { wrapper })

    result.current.mutate({ name: "Test", path: "/tmp/test" })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["projects"] })
  })

  it("rejects with error message on failure", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ message: "Name already taken" }),
    })

    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useCreateProject(), { wrapper })

    result.current.mutate({ name: "Dup", path: "/tmp/dup" })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error?.message).toBe("Name already taken")
  })
})

describe("useSelectProject", () => {
  it("calls correct endpoint", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    })

    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useSelectProject(), { wrapper })

    result.current.mutate({ id: "proj-1" as any })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(fetchMock).toHaveBeenCalledWith("/api/project/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "proj-1" }),
    })
  })

  it("invalidates both active and list queries on success", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    })

    const { wrapper, queryClient } = createWrapper()
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")
    const { result } = renderHook(() => useSelectProject(), { wrapper })

    result.current.mutate({ id: "proj-1" as any })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["projects", "active"],
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["projects", "list"],
    })
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
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(projects),
    })

    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useProjectList(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(projects)
    expect(Array.isArray(result.current.data)).toBe(true)
  })
})

describe("useActiveProject", () => {
  it("returns active project data", async () => {
    const active = {
      id: "p1",
      name: "Main",
      path: "/main",
      status: "active",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    }
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(active),
    })

    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useActiveProject(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(active)
  })

  it("throws when fetch fails", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500 })

    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useActiveProject(), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error?.message).toBe(
      "Failed to fetch active project"
    )
  })
})
