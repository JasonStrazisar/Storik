import * as Schema from "effect/Schema"
import { ProjectId } from "@storik/shared"
import { ProjectNameInvalidError, ProjectAlreadyArchivedError, ProjectAlreadyActiveError } from "./Project.errors"

export type ProjectStatus = "active" | "archived"

export class Project {
  readonly id: ProjectId
  readonly name: string
  readonly path: string
  readonly status: ProjectStatus
  readonly createdAt: string
  readonly updatedAt: string

  private constructor(props: { id: ProjectId; name: string; path: string; status: ProjectStatus; createdAt: string; updatedAt: string }) {
    this.id = props.id
    this.name = props.name
    this.path = props.path
    this.status = props.status
    this.createdAt = props.createdAt
    this.updatedAt = props.updatedAt
  }

  private static validateName(name: string): string {
    const trimmed = name.trim()
    if (trimmed.length < 1 || trimmed.length > 80) {
      throw new ProjectNameInvalidError({ reason: `Name must be 1-80 chars, got ${trimmed.length}` })
    }
    return trimmed
  }

  static create(input: { name: string; path: string }): Project {
    const validName = Project.validateName(input.name)
    const now = new Date().toISOString()
    const id = Schema.decodeSync(ProjectId)(crypto.randomUUID())
    return new Project({ id, name: validName, path: input.path, status: "active", createdAt: now, updatedAt: now })
  }

  static reconstitute(props: { id: ProjectId; name: string; path: string; status: ProjectStatus; createdAt: string; updatedAt: string }): Project {
    return new Project(props)
  }

  rename(newName: string): Project {
    const validName = Project.validateName(newName)
    return new Project({ ...this, name: validName, updatedAt: new Date().toISOString() })
  }

  archive(): Project {
    if (this.status === "archived") throw new ProjectAlreadyArchivedError({ id: this.id })
    return new Project({ ...this, status: "archived", updatedAt: new Date().toISOString() })
  }

  restore(): Project {
    if (this.status === "active") throw new ProjectAlreadyActiveError({ id: this.id })
    return new Project({ ...this, status: "active", updatedAt: new Date().toISOString() })
  }
}
