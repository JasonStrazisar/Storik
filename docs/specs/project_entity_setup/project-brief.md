# Project Entity Product Brief

## 1. Overview

`Project` is the parent entity of Storik. It scopes tickets and agents and acts as the workspace context users navigate in the app.

This brief defines the first product iteration for project management in a single-user local environment.

## 2. Product Goals

- Let users create and manage local codebase-backed projects with minimal friction.
- Ensure users always operate inside a valid active project context.
- Provide safe project lifecycle actions (rename, archive, restore) without data loss.

## 3. Non-Goals

- Authentication and user accounts.
- Multi-tenant project isolation.
- Remote sync across machines.
- Automatic repository discovery from machine-wide scanning.

## 4. Core User Experience

### 4.1 First Launch (Zero Projects)

- The app shows a blocking onboarding screen.
- User must create a project before accessing the rest of the application.
- Form has exactly 2 inputs:
  - `name`
  - `path`

### 4.2 Existing Projects

- A sidebar project selector is available.
- User can switch active project from this selector.
- Selector includes `Create project`, which opens the same onboarding screen in a cancelable mode.
- On successful creation, the new project becomes active immediately.

### 4.3 Active Project Resolution

- On app launch, restore the last used valid project.
- If last used project is archived or invalid, select another valid project.
- If no valid project exists, return to blocking onboarding.

## 5. Project Definition

### 5.1 User-Provided Fields

- `name`: required, trimmed, 1 to 80 chars.
- `path`: required; absolute path to an existing local git repository.

### 5.2 Persisted Fields

- `id`
- `name`
- `path`
- `createdAt`
- `updatedAt`
- `deletedAt` (soft delete marker)
- `lastUsedAt`

### 5.3 Constraints

- `path` must be unique across projects.
- `name` does not need to be unique.
- `path` is immutable in v1 (no path edit flow).

## 6. Lifecycle Behavior

### 6.1 Create

- Validate `name` and `path`.
- Reject duplicate `path`.
- Reject non-absolute, non-existing, or non-git paths.

### 6.2 Select

- Validate path again at activation time.
- If path is no longer valid, show the project as invalid and block activation.

### 6.3 Rename

- User can rename project `name`.
- Path remains unchanged.

### 6.4 Archive (Soft Delete)

- Project is archived via `deletedAt`.
- Archived projects are hidden from standard selector.
- If archived project was active, fallback selection applies.

### 6.5 Restore

- Archive administration view lists archived projects.
- User can restore archived projects.
- Restored projects return to active project catalog (subject to path validity checks at activation).

## 7. UX States

- `onboarding-blocking`: no projects available.
- `onboarding-cancelable`: opened from sidebar `Create project`.
- `project-valid`: selectable and activable.
- `project-invalid-path`: visible, not activable.
- `project-archived`: visible only in archive administration view.

## 8. Acceptance Criteria

- Zero-project launch always opens blocking onboarding.
- Creating a valid project succeeds and activates it.
- Duplicate path creation is rejected.
- Invalid path creation is rejected.
- Project switch updates active context.
- Rename updates displayed project name.
- Archiving active project switches to a valid fallback or onboarding.
- Restoring archived project makes it available again.
- No onboarding feature suggests detected repositories from machine scanning.

## 9. Roadmap

### V1 (Current)

- Create/select/rename/archive/restore project.
- Sidebar selector and archive administration view.
- Blocking onboarding for zero-project state.

### V1.1 (Near Term)

- Better archive management UX (search/filter/sort).
- Stronger validation/error copy and recovery hints.
- Optional import/export of project metadata.

### V2 (Mid Term)

- Collaborative models (if product direction changes).
- Extended repository integrations.
- Advanced project settings and automations.

