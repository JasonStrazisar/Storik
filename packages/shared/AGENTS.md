# @storik/shared

Shared schemas and types used by web and desktop command contracts.

## Rules

- Export everything via `src/index.ts`.
- Keep dependencies minimal and platform-agnostic.
- Define command payload and response contracts here when consumed by TypeScript clients.
- Do not add Tauri or Rust-specific dependencies.

## Current Contract Focus

- Project entity schemas/types.
- Command payloads (`CreateProjectPayload`, `SelectProjectPayload`, etc.).
- Active project response union and desktop command error shape.
