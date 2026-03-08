import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, cleanup } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { HarnessDashboardPage } from "./HarnessDashboardPage"

const mockUseActiveProject = vi.fn()
const mockUseHarnessAuditHistory = vi.fn()
const mockRunMutate = vi.fn()

vi.mock("../../projects/hooks/useProjectQueries", () => ({
  useActiveProject: () => mockUseActiveProject(),
}))

vi.mock("../hooks/useHarnessQueries", () => ({
  useHarnessAuditHistory: () => mockUseHarnessAuditHistory(),
}))

vi.mock("../hooks/useHarnessMutations", () => ({
  useRunHarnessAudit: () => ({
    mutate: mockRunMutate,
    isPending: false,
  }),
}))

describe("HarnessDashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseActiveProject.mockReturnValue({
      data: {
        status: "active",
        project: {
          id: "proj-1",
          name: "Alpha",
          path: "/alpha",
          status: "active",
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        },
      },
    })
    mockUseHarnessAuditHistory.mockReturnValue({
      isLoading: false,
      data: [
        {
          projectId: "proj-1",
          scannedAt: "2026-01-01T00:00:00Z",
          globalScore: 82,
          dimensionScores: { context: 100, skills: 70, toolsMcp: 76 },
          findingCounts: { p0: 0, p1: 1, p2: 2 },
          requiresOverride: false,
        },
      ],
    })
  })

  afterEach(() => {
    cleanup()
  })

  it("renders score cards and history", () => {
    render(<HarnessDashboardPage />)
    expect(screen.getByTestId("harness-dashboard")).toBeInTheDocument()
    expect(screen.getByText("Score 82")).toBeInTheDocument()
    expect(screen.getByText("P0: 0 | P1: 1 | P2: 2")).toBeInTheDocument()
  })

  it("triggers audit run", async () => {
    const user = userEvent.setup()
    render(<HarnessDashboardPage />)
    await user.click(screen.getByTestId("run-harness-audit"))
    expect(mockRunMutate).toHaveBeenCalledWith({ projectId: "proj-1" })
  })
})
