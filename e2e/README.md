# Storik E2E Tests

End-to-end tests using Playwright.

## Preconditions

- Both API (port 3001) and Web (port 5173) running
- Run `pnpm dev` from monorepo root

## Run Tests

```bash
pnpm test:e2e
```

## Test Fixtures

See `helpers/project-fixtures.ts` for utilities to set up test data via API.

## Coverage

- Onboarding flow: clean state, fill form, create project, verify navigation
- API CRUD: create project, verify listing
- Archive/restore lifecycle: archive via API, verify lists, restore, verify
- Multi-project switching: create two projects, verify both visible
- Archive UI: archive project, verify removed from active view
