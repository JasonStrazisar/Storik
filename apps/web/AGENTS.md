# @storik/web

React 19 + Vite + TanStack Router UI running inside Tauri desktop.

## Runtime Contract

- Do not call REST endpoints from hooks/components.
- All project operations must go through `src/features/projects/infrastructure/desktopClient.ts`.
- `desktopClient` calls Tauri `invoke` commands implemented in Rust.

## Routing & Styling

- File-based routes in `src/routes/`
- TanStack Router plugin auto-generates `src/routeTree.gen.ts` — **never edit**
- TailwindCSS v4 is configured via Vite plugin and `src/index.css`
- Use Tailwind utility classes for component styling
- Do not introduce PandaCSS/styled-system back into the web app

## Commands

- `pnpm dev:web` — web-only dev server (for UI iteration)
- `pnpm --filter @storik/web build` — web assets build for desktop bundle
- `pnpm test` — vitest from monorepo root (happy-dom)

## Testing Strategy

- Hook/page tests should mock `desktopClient` methods, not `fetch`.
- Preserve React Query cache keys and invalidation behavior.
- Keep onboarding/active-project UX behavior stable while transport evolves.
