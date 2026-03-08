import { Data } from "effect"

export class ProjectNotFoundError extends Data.TaggedError("ProjectNotFoundError")<{ id: string }> {}
export class ProjectNameInvalidError extends Data.TaggedError("ProjectNameInvalidError")<{ reason: string }> {}
export class ProjectAlreadyArchivedError extends Data.TaggedError("ProjectAlreadyArchivedError")<{ id: string }> {}
export class ProjectAlreadyActiveError extends Data.TaggedError("ProjectAlreadyActiveError")<{ id: string }> {}
export class RepositoryError extends Data.TaggedError("RepositoryError")<{ cause: unknown }> {}
