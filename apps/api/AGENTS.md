# @storik/api

Effect HTTP server on port 3001, SQLite persistence.

## Stack

- `effect`, `@effect/platform`, `@effect/platform-node` for HTTP
- `@effect/sql` + `@effect/sql-sqlite-node` for database
- `tsx watch` for dev

## Patterns

- Routes: `HttpRouter.get/post/...` composed with `HttpRouter.empty.pipe(...)`
- Services: use Effect `Layer` / `Context.Tag` pattern
- Run with `NodeRuntime.runMain`
- Errors: use Effect typed errors, never throw

## Commands

- `pnpm dev:api` — start with watch mode
- `pnpm test` — run from monorepo root
