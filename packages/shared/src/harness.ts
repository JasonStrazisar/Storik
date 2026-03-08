import * as Schema from "@effect/schema/Schema"
import { ProjectId } from "./project"

const IsoDateString = Schema.String.pipe(
  Schema.pattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/)
)

export const HarnessPolicyVersion = Schema.String.pipe(Schema.minLength(1))
export type HarnessPolicyVersion = Schema.Schema.Type<typeof HarnessPolicyVersion>

export const HarnessDimension = Schema.Literal("context", "skills", "tools_mcp")
export type HarnessDimension = Schema.Schema.Type<typeof HarnessDimension>

export const HarnessSeverity = Schema.Literal("P0", "P1", "P2")
export type HarnessSeverity = Schema.Schema.Type<typeof HarnessSeverity>

export const HarnessEvidence = Schema.Struct({
  filePath: Schema.String,
  excerpt: Schema.optional(Schema.String),
})
export type HarnessEvidence = Schema.Schema.Type<typeof HarnessEvidence>

export const HarnessProfile = Schema.Struct({
  policyVersion: HarnessPolicyVersion,
  contextFiles: Schema.Array(Schema.String),
  skillFiles: Schema.Array(Schema.String),
  toolingFiles: Schema.Array(Schema.String),
})
export type HarnessProfile = Schema.Schema.Type<typeof HarnessProfile>

export const HarnessScore = Schema.Struct({
  global: Schema.Number.pipe(Schema.int(), Schema.between(0, 100)),
  context: Schema.Number.pipe(Schema.int(), Schema.between(0, 100)),
  skills: Schema.Number.pipe(Schema.int(), Schema.between(0, 100)),
  toolsMcp: Schema.Number.pipe(Schema.int(), Schema.between(0, 100)),
})
export type HarnessScore = Schema.Schema.Type<typeof HarnessScore>

export const HarnessFinding = Schema.Struct({
  id: Schema.String,
  severity: HarnessSeverity,
  dimension: HarnessDimension,
  title: Schema.String,
  description: Schema.String,
  evidence: Schema.Array(HarnessEvidence),
})
export type HarnessFinding = Schema.Schema.Type<typeof HarnessFinding>

export const HarnessAction = Schema.Struct({
  id: Schema.String,
  priority: HarnessSeverity,
  effort: Schema.Literal("S", "M", "L"),
  impact: Schema.Literal("low", "medium", "high"),
  title: Schema.String,
  description: Schema.String,
})
export type HarnessAction = Schema.Schema.Type<typeof HarnessAction>

export const HarnessGate = Schema.Struct({
  threshold: Schema.Number.pipe(Schema.int(), Schema.between(0, 100)),
  requiresOverride: Schema.Boolean,
  triggeredByP0: Schema.Boolean,
})
export type HarnessGate = Schema.Schema.Type<typeof HarnessGate>

export const HarnessAuditResult = Schema.Struct({
  projectId: ProjectId,
  scannedAt: IsoDateString,
  profile: HarnessProfile,
  score: HarnessScore,
  findings: Schema.Array(HarnessFinding),
  actions: Schema.Array(HarnessAction),
  gate: HarnessGate,
})
export type HarnessAuditResult = Schema.Schema.Type<typeof HarnessAuditResult>

export const HarnessAuditHistoryEntry = Schema.Struct({
  projectId: ProjectId,
  scannedAt: IsoDateString,
  globalScore: Schema.Number.pipe(Schema.int(), Schema.between(0, 100)),
  dimensionScores: Schema.Struct({
    context: Schema.Number.pipe(Schema.int(), Schema.between(0, 100)),
    skills: Schema.Number.pipe(Schema.int(), Schema.between(0, 100)),
    toolsMcp: Schema.Number.pipe(Schema.int(), Schema.between(0, 100)),
  }),
  findingCounts: Schema.Struct({
    p0: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
    p1: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
    p2: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
  }),
  requiresOverride: Schema.Boolean,
})
export type HarnessAuditHistoryEntry = Schema.Schema.Type<typeof HarnessAuditHistoryEntry>

export const RunHarnessAuditPayload = Schema.Struct({
  projectId: ProjectId,
})
export type RunHarnessAuditPayload = Schema.Schema.Type<typeof RunHarnessAuditPayload>

export const ListHarnessAuditHistoryPayload = Schema.Struct({
  projectId: ProjectId,
})
export type ListHarnessAuditHistoryPayload = Schema.Schema.Type<typeof ListHarnessAuditHistoryPayload>

export const SetHarnessGateOverridePayload = Schema.Struct({
  projectId: ProjectId,
  reason: Schema.String.pipe(Schema.minLength(5), Schema.maxLength(500)),
})
export type SetHarnessGateOverridePayload = Schema.Schema.Type<typeof SetHarnessGateOverridePayload>

export const HarnessGateStatus = Schema.Struct({
  projectId: ProjectId,
  requiresOverride: Schema.Boolean,
  overriddenAt: Schema.NullOr(IsoDateString),
  overrideReason: Schema.NullOr(Schema.String),
})
export type HarnessGateStatus = Schema.Schema.Type<typeof HarnessGateStatus>
