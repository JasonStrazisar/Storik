import * as Schema from "@effect/schema/Schema"
import * as Either from "effect/Either"

// Internal building blocks (not exported)
const ProjectName = Schema.transform(
  Schema.String,
  Schema.String.pipe(Schema.minLength(1), Schema.maxLength(80)),
  {
    strict: false,
    decode: (s) => s.trim(),
    encode: (s) => s,
  }
)

const AbsolutePath = Schema.String.pipe(Schema.startsWith("/"))

const ProjectStatus = Schema.Literal("active", "archived")

const IsoDateString = Schema.String.pipe(
  Schema.pattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/)
)

// Exported schemas with their TypeScript types

export const ProjectId = Schema.NonEmptyString.pipe(
  Schema.brand("ProjectId")
)
export type ProjectId = Schema.Schema.Type<typeof ProjectId>

export const Project = Schema.Struct({
  id: ProjectId,
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(80)),
  path: AbsolutePath,
  status: ProjectStatus,
  createdAt: IsoDateString,
  updatedAt: IsoDateString,
})
export type Project = Schema.Schema.Type<typeof Project>

export const ActiveProject = Schema.Struct({
  id: ProjectId,
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(80)),
  path: AbsolutePath,
  status: Schema.Literal("active"),
  createdAt: IsoDateString,
  updatedAt: IsoDateString,
})
export type ActiveProject = Schema.Schema.Type<typeof ActiveProject>

export const CreateProjectPayload = Schema.Struct({
  name: ProjectName,
  path: AbsolutePath,
})
export type CreateProjectPayload = Schema.Schema.Type<
  typeof CreateProjectPayload
>

export const SelectProjectPayload = Schema.Struct({
  id: ProjectId,
})
export type SelectProjectPayload = Schema.Schema.Type<
  typeof SelectProjectPayload
>

export const RenameProjectPayload = Schema.Struct({
  id: ProjectId,
  newName: ProjectName,
})
export type RenameProjectPayload = Schema.Schema.Type<
  typeof RenameProjectPayload
>

export const ArchiveProjectPayload = Schema.Struct({
  id: ProjectId,
})
export type ArchiveProjectPayload = Schema.Schema.Type<
  typeof ArchiveProjectPayload
>

export const RestoreProjectPayload = Schema.Struct({
  id: ProjectId,
})
export type RestoreProjectPayload = Schema.Schema.Type<
  typeof RestoreProjectPayload
>

export const ProjectListResponse = Schema.Array(Project)
export type ProjectListResponse = Schema.Schema.Type<
  typeof ProjectListResponse
>

export const ProjectActiveListResponse = Schema.Array(ActiveProject)
export type ProjectActiveListResponse = Schema.Schema.Type<
  typeof ProjectActiveListResponse
>

export const ActiveProjectResponse = Schema.Union(
  Schema.Struct({
    status: Schema.Literal("active"),
    project: Project,
  }),
  Schema.Struct({
    status: Schema.Literal("onboarding-required"),
  })
)
export type ActiveProjectResponse = Schema.Schema.Type<typeof ActiveProjectResponse>
export type DesktopCommandError = {
  code?: string
  message: string
}
