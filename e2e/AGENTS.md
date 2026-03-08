# E2E Tests

Playwright end-to-end tests against `http://localhost:5173`.

## Commands

- `pnpm test:e2e` — run from monorepo root
- `pnpm test:e2e:ui` — Playwright UI mode

## Notes

- Tests in `tests/` directory
- Playwright auto-starts API + web via `webServer` config
- Chromium only by default
