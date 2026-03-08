import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, cleanup } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ProjectSelector } from "./ProjectSelector"

const mockProjectList = vi.fn()
const mockActiveProject = vi.fn()
const mockSelectMutate = vi.fn()
const mockCreateMutateAsync = vi.fn()

vi.mock("../hooks/useProjectQueries", () => ({
  useProjectList: () => mockProjectList(),
  useActiveProject: () => mockActiveProject(),
}))

vi.mock("../hooks/useProjectMutations", () => ({
  useSelectProject: () => ({
    mutate: mockSelectMutate,
    isPending: false,
  }),
  useCreateProject: () => ({
    mutateAsync: mockCreateMutateAsync,
    isPending: false,
  }),
}))

const fakeProjects = [
  { id: "p1", name: "Alpha", path: "/alpha", status: "active", createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z" },
  { id: "p2", name: "Beta", path: "/beta", status: "active", createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z" },
]

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  vi.clearAllMocks()
  mockProjectList.mockReturnValue({ data: fakeProjects, isLoading: false })
  mockActiveProject.mockReturnValue({ data: { status: "active", project: fakeProjects[0] } })
})

describe("ProjectSelector", () => {
  it("renders project list from useProjectList", () => {
    render(<ProjectSelector />)
    expect(screen.getByText("Alpha")).toBeInTheDocument()
    expect(screen.getByText("Beta")).toBeInTheDocument()
    expect(screen.getByTestId("harness-link")).toBeInTheDocument()
  })

  it("shows loading state", () => {
    mockProjectList.mockReturnValue({ data: undefined, isLoading: true })
    render(<ProjectSelector />)
    expect(screen.getByTestId("selector-loading")).toBeInTheDocument()
  })

  it("active project is highlighted", () => {
    render(<ProjectSelector />)
    const activeItem = screen.getByTestId("project-item-p1")
    expect(activeItem).toHaveStyle({ fontWeight: "bold" })
    expect(screen.getByTestId("active-indicator")).toBeInTheDocument()

    const inactiveItem = screen.getByTestId("project-item-p2")
    expect(inactiveItem).toHaveStyle({ fontWeight: "normal" })
  })

  it("active project button is disabled", () => {
    render(<ProjectSelector />)
    expect(screen.getByTestId("select-project-p1")).toBeDisabled()
    expect(screen.getByTestId("select-project-p2")).toBeEnabled()
  })

  it("clicking other project calls select mutation", async () => {
    const user = userEvent.setup()
    render(<ProjectSelector />)
    await user.click(screen.getByTestId("select-project-p2"))
    expect(mockSelectMutate).toHaveBeenCalledWith({ id: "p2" })
  })

  it("'+ Add project' button opens inline form", async () => {
    const user = userEvent.setup()
    render(<ProjectSelector />)
    expect(screen.queryByTestId("inline-create-form")).not.toBeInTheDocument()
    await user.click(screen.getByTestId("add-project-button"))
    expect(screen.getByTestId("inline-create-form")).toBeInTheDocument()
  })

  it("cancel button closes form without mutation", async () => {
    const user = userEvent.setup()
    render(<ProjectSelector />)
    await user.click(screen.getByTestId("add-project-button"))
    expect(screen.getByTestId("inline-create-form")).toBeInTheDocument()
    await user.click(screen.getByTestId("create-cancel"))
    expect(screen.queryByTestId("inline-create-form")).not.toBeInTheDocument()
    expect(mockCreateMutateAsync).not.toHaveBeenCalled()
  })

  it("form is hidden when not open", () => {
    render(<ProjectSelector />)
    expect(screen.queryByTestId("inline-create-form")).not.toBeInTheDocument()
    expect(screen.getByTestId("add-project-button")).toBeInTheDocument()
  })

  it("submitting form calls create mutation", async () => {
    const user = userEvent.setup()
    mockCreateMutateAsync.mockResolvedValue({})
    render(<ProjectSelector />)
    await user.click(screen.getByTestId("add-project-button"))
    await user.type(screen.getByTestId("create-name-input"), "Gamma")
    await user.type(screen.getByTestId("create-path-input"), "/gamma")
    await user.click(screen.getByTestId("create-submit"))
    expect(mockCreateMutateAsync).toHaveBeenCalledWith({ name: "Gamma", path: "/gamma" })
  })
})
