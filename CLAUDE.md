# Storik

Ticketing system for autonomous AI coding agents. Users manage projects, goals, and tasks assigned to agents.

## Monorepo Structure

- **pnpm workspaces** — always use `pnpm`, never npm/yarn
- `packages/shared` — @storik/shared (types, schemas)
- `apps/api` — @storik/api (Effect HTTP server, port 3001)
- `apps/web` — @storik/web (React 19 + Vite, port 5173)
- `e2e/` — Playwright end-to-end tests

## Commands

- `pnpm dev` — start API + web in parallel
- `pnpm test` — run vitest (unit tests)
- `pnpm test:e2e` — run Playwright tests
- `pnpm build` — build web app

## Rules

- TypeScript strict mode everywhere
- Tests use vitest (root config), happy-dom for web
- Never edit generated files: `routeTree.gen.ts`, `styled-system/`
- Keep shared package dependency-minimal

## Architecture

See [@ARCHITECTURE.md](./ARCHITECTURE.md) for full details.

Five patterns govern every feature:
- **Feature Slices** — organize by domain, not technical layer (`features/<name>/domain|application|infrastructure`)
- **Hexagonal** — domain has zero infra deps; Effect `Layer` wires adapters in `main.ts` only
- **DDD** — entities, value objects, aggregates, repositories live in `domain/`
- **CQRS** — commands (mutate) and queries (read) in separate files under `application/`
- **TDD** — red → green → refactor; use `/tdd` skill; never skip a failing test
