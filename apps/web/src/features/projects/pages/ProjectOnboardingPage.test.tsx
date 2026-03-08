import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, cleanup } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ProjectOnboardingPage } from "./ProjectOnboardingPage"

const mockMutateAsync = vi.fn()
const mockNavigate = vi.fn()
let mockIsPending = false

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}))

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({}),
  useMutation: () => ({
    mutateAsync: mockMutateAsync,
    get isPending() {
      return mockIsPending
    },
  }),
}))

describe("ProjectOnboardingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockMutateAsync.mockResolvedValue(undefined)
    mockIsPending = false
  })

  afterEach(() => {
    cleanup()
  })

  it("renders name and path inputs", () => {
    render(<ProjectOnboardingPage />)
    expect(screen.getByTestId("project-name-input")).toBeInTheDocument()
    expect(screen.getByTestId("project-path-input")).toBeInTheDocument()
  })

  it("renders submit button", () => {
    render(<ProjectOnboardingPage />)
    expect(screen.getByTestId("submit-button")).toBeInTheDocument()
    expect(screen.getByTestId("submit-button")).toHaveTextContent("Continue")
  })

  it("submits form with entered data", async () => {
    const user = userEvent.setup()
    render(<ProjectOnboardingPage />)

    await user.type(screen.getByTestId("project-name-input"), "My Project")
    await user.type(screen.getByTestId("project-path-input"), "/home/project")
    await user.click(screen.getByTestId("submit-button"))

    expect(mockMutateAsync).toHaveBeenCalledWith({
      name: "My Project",
      path: "/home/project",
    })
  })

  it("shows error message on mutation failure", async () => {
    mockMutateAsync.mockRejectedValue(new Error("Invalid path"))
    const user = userEvent.setup()
    render(<ProjectOnboardingPage />)

    await user.type(screen.getByTestId("project-name-input"), "Test")
    await user.type(screen.getByTestId("project-path-input"), "bad-path")
    await user.click(screen.getByTestId("submit-button"))

    expect(await screen.findByTestId("error-message")).toHaveTextContent("Invalid path")
  })

  it("navigates to home on success", async () => {
    const user = userEvent.setup()
    render(<ProjectOnboardingPage />)

    await user.type(screen.getByTestId("project-name-input"), "My Project")
    await user.type(screen.getByTestId("project-path-input"), "/home/project")
    await user.click(screen.getByTestId("submit-button"))

    expect(mockNavigate).toHaveBeenCalledWith({ to: "/" })
  })

  it("disables inputs and button when loading", () => {
    mockIsPending = true
    render(<ProjectOnboardingPage />)

    expect(screen.getByTestId("project-name-input")).toBeDisabled()
    expect(screen.getByTestId("project-path-input")).toBeDisabled()
    expect(screen.getByTestId("submit-button")).toBeDisabled()
    expect(screen.getByTestId("submit-button")).toHaveTextContent("Continue")
  })
})
