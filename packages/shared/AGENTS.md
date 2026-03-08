# @storik/shared

Shared types and schemas using Effect Schema.

## Rules

- Export everything from `src/index.ts` (barrel file)
- Only dependency: `effect` — keep it minimal, no platform-specific deps
- Used by both `@storik/api` and `@storik/web`
- Define domain types and schemas here, not in app packages
