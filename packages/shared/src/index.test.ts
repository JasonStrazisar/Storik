import { describe, it, expect } from "vitest"

describe("@storik/shared", () => {
  it("should be importable", async () => {
    const mod = await import("./index")
    expect(mod).toBeDefined()
  })
})
