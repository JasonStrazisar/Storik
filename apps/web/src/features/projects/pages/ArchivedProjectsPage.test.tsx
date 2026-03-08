import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ArchivedProjectsPage } from "./ArchivedProjectsPage"

const mockArchivedProjectList = vi.fn()
const mockRestoreMutate = vi.fn()
let restoreIsPending = false

vi.mock("../hooks/useProjectQueries", () => ({
  useArchivedProjectList: () => mockArchivedProjectList(),
}))

vi.mock("../hooks/useProjectMutations", () => ({
  useRestoreProject: () => ({
    mutate: mockRestoreMutate,
    get isPending() {
      return restoreIsPending
    },
  }),
}))

const fakeArchivedProjects = [
  { id: "p1", name: "Old Project", path: "/old", status: "archived", createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-06-01T00:00:00Z" },
  { id: "p2", name: "Legacy App", path: "/legacy", status: "archived", createdAt: "2025-02-01T00:00:00Z", updatedAt: "2025-06-01T00:00:00Z" },
]

beforeEach(() => {
  vi.clearAllMocks()
  restoreIsPending = false
  mockArchivedProjectList.mockReturnValue({ data: fakeArchivedProjects, isLoading: false })
})

describe("ArchivedProjectsPage", () => {
  it("renders archived list from useArchivedProjectList", () => {
    render(<ArchivedProjectsPage />)
    expect(screen.getAllByTestId("archived-projects-page").length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText("Old Project").length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText("Legacy App").length).toBeGreaterThanOrEqual(1)
  })

  it("renders ProjectStatusBadge for each project", () => {
    render(<ArchivedProjectsPage />)
    const rows = screen.getAllByTestId("archived-project-p1")
    expect(within(rows[0]).getByText("Archived")).toBeInTheDocument()
    const rows2 = screen.getAllByTestId("archived-project-p2")
    expect(within(rows2[0]).getByText("Archived")).toBeInTheDocument()
  })

  it("restore button calls restore mutation", async () => {
    const user = userEvent.setup()
    render(<ArchivedProjectsPage />)
    const rows = screen.getAllByTestId("archived-project-p1")
    await user.click(within(rows[0]).getByRole("button", { name: "Restore" }))
    expect(mockRestoreMutate).toHaveBeenCalledWith({ id: "p1" })
  })

  it("shows loading state", () => {
    mockArchivedProjectList.mockReturnValue({ data: undefined, isLoading: true })
    render(<ArchivedProjectsPage />)
    expect(screen.getAllByTestId("loading").length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText("Loading archived projects...").length).toBeGreaterThanOrEqual(1)
  })

  it("shows empty state when no archived projects", () => {
    mockArchivedProjectList.mockReturnValue({ data: [], isLoading: false })
    render(<ArchivedProjectsPage />)
    expect(screen.getAllByText("No archived projects").length).toBeGreaterThanOrEqual(1)
  })

  it("disables restore button when mutation is pending", () => {
    restoreIsPending = true
    const { container } = render(<ArchivedProjectsPage />)
    const restoreButtons = container.querySelectorAll("[data-testid^='restore-button-']")
    expect(restoreButtons.length).toBeGreaterThan(0)
    restoreButtons.forEach((button) => {
      expect(button).toBeDisabled()
    })
  })
})
