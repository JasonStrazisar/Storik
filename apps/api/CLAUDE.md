# @storik/api (Legacy)

Legacy Effect HTTP backend. Not part of the desktop runtime path.

## Current Role

- Reference implementation for project domain workflows during migration.
- Useful for comparing legacy REST behavior to desktop Tauri command behavior.
- Do not introduce new product features here unless explicitly requested.

## Commands

- `pnpm dev:api` — optional legacy watch mode
- `pnpm test` — run monorepo tests from root

## Notes

- Desktop runtime uses Rust commands in `apps/desktop/src-tauri/src/main.rs`.
- Frontend no longer depends on `localhost:3001` at runtime.
