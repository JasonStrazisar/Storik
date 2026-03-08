import { SqlClient } from "@effect/sql"
import { SqliteClient } from "@effect/sql-sqlite-node"
import { Effect, Layer, Option } from "effect"
import { ProjectId } from "@storik/shared"
import * as Schema from "effect/Schema"
import { Project } from "../domain/Project"
import { ProjectRepository } from "../domain/ProjectRepository"
import { RepositoryError } from "../domain/Project.errors"

interface ProjectRow {
  readonly id: string
  readonly name: string
  readonly path: string
  readonly status: "active" | "archived"
  readonly created_at: string
  readonly updated_at: string
  readonly deleted_at: string | null
}

const toProject = (row: ProjectRow): Project =>
  Project.reconstitute({
    id: Schema.decodeSync(ProjectId)(row.id),
    name: row.name,
    path: row.path,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  })

export const SqliteProjectRepositoryLive = Layer.effect(
  ProjectRepository,
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient

    return ProjectRepository.of({
      save: (project: Project) =>
        sql`INSERT INTO projects (id, name, path, status, created_at, updated_at)
            VALUES (${project.id}, ${project.name}, ${project.path}, ${project.status}, ${project.createdAt}, ${project.updatedAt})
            ON CONFLICT(id) DO UPDATE SET
              name = ${project.name},
              path = ${project.path},
              status = ${project.status},
              updated_at = ${project.updatedAt}`
          .pipe(
            Effect.map(() => project),
            Effect.catchAll((cause) => Effect.fail(new RepositoryError({ cause }))),
          ),

      findById: (id: ProjectId) =>
        sql<ProjectRow>`SELECT * FROM projects WHERE id = ${id} AND deleted_at IS NULL`
          .pipe(
            Effect.map((rows) =>
              rows.length > 0 ? Option.some(toProject(rows[0])) : Option.none(),
            ),
            Effect.catchAll((cause) => Effect.fail(new RepositoryError({ cause }))),
          ),

      findAll: () =>
        sql<ProjectRow>`SELECT * FROM projects WHERE deleted_at IS NULL`
          .pipe(
            Effect.map((rows) => rows.map(toProject)),
            Effect.catchAll((cause) => Effect.fail(new RepositoryError({ cause }))),
          ),

      findByPath: (path: string) =>
        sql<ProjectRow>`SELECT * FROM projects WHERE path = ${path} AND deleted_at IS NULL`
          .pipe(
            Effect.map((rows) =>
              rows.length > 0 ? Option.some(toProject(rows[0])) : Option.none(),
            ),
            Effect.catchAll((cause) => Effect.fail(new RepositoryError({ cause }))),
          ),

      getActiveProjectId: () =>
        sql<{ project_id: string }>`SELECT project_id FROM project_active WHERE id = 1`
          .pipe(
            Effect.map((rows) =>
              rows.length > 0
                ? Option.some(Schema.decodeSync(ProjectId)(rows[0].project_id))
                : Option.none(),
            ),
            Effect.catchAll((cause) => Effect.fail(new RepositoryError({ cause }))),
          ),

      setActiveProjectId: (id: ProjectId) =>
        sql`INSERT OR REPLACE INTO project_active (id, project_id) VALUES (1, ${id})`
          .pipe(
            Effect.asVoid,
            Effect.catchAll((cause) => Effect.fail(new RepositoryError({ cause }))),
          ),

      clearActiveProjectId: () =>
        sql`DELETE FROM project_active WHERE id = 1`
          .pipe(
            Effect.asVoid,
            Effect.catchAll((cause) => Effect.fail(new RepositoryError({ cause }))),
          ),
    })
  }),
)

export const makeTestLayer = () =>
  SqliteProjectRepositoryLive.pipe(
    Layer.provideMerge(SqliteClient.layer({ filename: ":memory:" })),
  )
