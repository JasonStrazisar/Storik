import { describe, it, expect } from "vitest"
import * as Either from "effect/Either"
import * as Schema from "@effect/schema/Schema"
import { HarnessAuditResult, HarnessGateStatus } from "./harness"

describe("HarnessAuditResult", () => {
  it("accepts valid payload", () => {
    const result = Schema.decodeEither(HarnessAuditResult)({
      projectId: "proj-1",
      scannedAt: "2026-03-08T10:30:00Z",
      profile: {
        policyVersion: "harness-policy-v1",
        contextFiles: ["AGENTS.md"],
        skillFiles: [".agents/skills/tdd/SKILL.md"],
        toolingFiles: ["mcp.json"],
      },
      score: {
        global: 90,
        context: 100,
        skills: 80,
        toolsMcp: 90,
      },
      findings: [],
      actions: [],
      gate: {
        threshold: 70,
        requiresOverride: false,
        triggeredByP0: false,
      },
    })
    expect(Either.isRight(result)).toBe(true)
  })
})

describe("HarnessGateStatus", () => {
  it("accepts null override values", () => {
    const result = Schema.decodeEither(HarnessGateStatus)({
      projectId: "proj-1",
      requiresOverride: true,
      overriddenAt: null,
      overrideReason: null,
    })
    expect(Either.isRight(result)).toBe(true)
  })
})
