# Storik

Ticketing system for autonomous AI coding agents. Runtime is desktop-first with Tauri.

## Monorepo Structure

- **pnpm workspaces** — always use `pnpm`, never npm/yarn
- `apps/desktop` — @storik/desktop (Tauri app + Rust commands + SQLite persistence)
- `apps/web` — @storik/web (React 19 UI rendered inside Tauri webview)
- `packages/shared` — @storik/shared (shared schemas/types and command payload contracts)
- `apps/api` — legacy Effect HTTP backend (not required for desktop runtime)
- `e2e/` — Playwright harness (browser-focused; desktop smoke is Rust command tests)

## Commands

- `pnpm dev` or `pnpm dev:desktop` — run Tauri desktop app in dev mode
- `pnpm build` or `pnpm build:desktop` — build desktop app bundle
- `pnpm build:web` — build web assets only
- `pnpm test` — run vitest tests
- `pnpm test:desktop` — run Rust command/persistence tests (`cargo test` in `apps/desktop/src-tauri`)
- `pnpm test:e2e` — Playwright tests (not the primary desktop validation path)

## Runtime Boundaries

- App runtime has **no Node API dependency**.
- Frontend data access uses Tauri `invoke` through `apps/web/src/features/projects/infrastructure/desktopClient.ts`.
- Backend command handlers and SQLite logic live in `apps/desktop/src-tauri/src/main.rs`.
- SQLite file is created in Tauri app data directory.
- Tauri icon path is `apps/desktop/src-tauri/icons/icon.png` and must be an **RGBA PNG** (recommended `512x512`).

## Rules

- TypeScript strict mode everywhere; keep Rust command payloads and shared TS contracts aligned.
- Tests use vitest for web/shared and Rust tests for desktop command behavior.
- Never edit generated files: `routeTree.gen.ts`, `styled-system/`.
- Keep `@storik/shared` dependency-minimal and platform-agnostic.

## Architecture

See [@ARCHITECTURE.md](./ARCHITECTURE.md) for full details.

Five patterns govern every feature:
- **Feature Slices** — organize by domain, not technical layer (`features/<name>/domain|application|infrastructure`)
- **Hexagonal** — domain has zero infra deps; adapters wire at app runtime boundaries
- **DDD** — entities, value objects, aggregates, repositories live in domain boundaries
- **CQRS** — commands (mutate) and queries (read) are distinct handlers
- **TDD** — red → green → refactor; never skip failing tests
