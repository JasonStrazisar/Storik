# E2E Tests

Playwright harness for browser-oriented UI checks. Desktop validation is primarily Rust command tests in `apps/desktop`.

## Commands

- `pnpm test:e2e` — run from monorepo root
- `pnpm test:e2e:ui` — Playwright UI mode

## Notes

- Current product runtime is Tauri desktop; browser e2e is secondary coverage.
- Prefer adding/maintaining Rust command tests for desktop behavior and persistence.
