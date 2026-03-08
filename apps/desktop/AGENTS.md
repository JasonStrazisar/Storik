# @storik/desktop

Tauri desktop runtime for Storik (macOS v1).

## Stack

- Tauri v2 (`@tauri-apps/cli`)
- Rust backend commands in `src-tauri/src/main.rs`
- SQLite persistence in app data directory
- React frontend served from `apps/web`

## Commands

- `pnpm --filter @storik/desktop run check:icon` — validate icon format before Tauri commands
- `pnpm --filter @storik/desktop dev` — run desktop app in dev mode
- `pnpm --filter @storik/desktop build` — build desktop app bundle
- `pnpm --filter @storik/desktop test:rust` — run Rust tests

## Icon Requirements

- Required icon path: `src-tauri/icons/icon.png`
- Must be a **PNG RGBA** file (not grayscale/gray+alpha)
- Recommended size for placeholder/branding assets: `512x512`
- Failing this requirement breaks `tauri::generate_context!()` at compile time
