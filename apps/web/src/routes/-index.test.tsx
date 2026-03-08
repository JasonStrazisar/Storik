import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { Route } from "./index"

describe("Index route", () => {
  it("renders Storik text", () => {
    const Component = Route.options.component!
    render(<Component />)
    expect(screen.getByText("Storik")).toBeInTheDocument()
  })
})
