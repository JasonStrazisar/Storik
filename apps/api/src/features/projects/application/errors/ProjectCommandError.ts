import { Data } from "effect"

export class DuplicatePathError extends Data.TaggedError("DuplicatePathError")<{ path: string }> {}
export class PathValidationError extends Data.TaggedError("PathValidationError")<{ path: string; reason: string }> {}
