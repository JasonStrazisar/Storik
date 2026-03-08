import { Effect, Context } from "effect"

export type ValidationResult = { valid: true } | { valid: false; reason: string }

export interface PathValidationPort {
  readonly validate: (path: string) => Effect.Effect<ValidationResult, never>
}

export const PathValidationPort = Context.GenericTag<PathValidationPort>("PathValidationPort")
