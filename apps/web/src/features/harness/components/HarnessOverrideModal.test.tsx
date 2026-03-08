import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { HarnessOverrideModal } from "./HarnessOverrideModal"

describe("HarnessOverrideModal", () => {
  it("does not render when closed", () => {
    render(<HarnessOverrideModal open={false} isPending={false} onClose={() => {}} onSubmit={() => {}} />)
    expect(screen.queryByTestId("harness-override-modal")).not.toBeInTheDocument()
  })

  it("submits reason when valid", async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<HarnessOverrideModal open isPending={false} onClose={() => {}} onSubmit={onSubmit} />)

    await user.type(screen.getByTestId("harness-override-reason"), "Valid reason")
    await user.click(screen.getByText("Confirm override"))
    expect(onSubmit).toHaveBeenCalledWith("Valid reason")
  })
})
