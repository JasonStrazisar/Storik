import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { HarnessSoftGateBanner } from "./HarnessSoftGateBanner"

describe("HarnessSoftGateBanner", () => {
  it("shows override call-to-action when gate is active", async () => {
    const onOverrideClick = vi.fn()
    const user = userEvent.setup()
    render(<HarnessSoftGateBanner requiresOverride overriddenAt={null} onOverrideClick={onOverrideClick} />)
    expect(screen.getByTestId("harness-soft-gate-banner")).toBeInTheDocument()
    await user.click(screen.getByText("Override"))
    expect(onOverrideClick).toHaveBeenCalledTimes(1)
  })

  it("shows overridden state", () => {
    render(
      <HarnessSoftGateBanner
        requiresOverride={false}
        overriddenAt="2026-01-01T00:00:00Z"
        onOverrideClick={() => {}}
      />
    )
    expect(screen.getByTestId("harness-soft-gate-overridden")).toBeInTheDocument()
  })
})
