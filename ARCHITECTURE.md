# Storik Architecture

Five patterns govern every feature. They compose: a feature slice owns its DDD domain, exposes ports (hexagonal), separates reads from writes (CQRS), and is built test-first (TDD).

---

## 1. Feature Slices

Code is organized by **feature domain**, not by technical layer. Each feature is self-contained.

```
apps/api/src/
  features/
    tasks/
      domain/          # entities, value objects, aggregates
      application/     # commands, queries, handlers
      infrastructure/  # DB repositories, HTTP adapters
      router.ts        # mounts HTTP routes for this feature
    projects/
    agents/
  shared/              # cross-feature utilities

apps/web/src/
  features/
    tasks/
      components/      # UI components for this feature
      hooks/           # data-fetching hooks
      pages/           # TanStack route components
    projects/
    agents/
  shared/              # shared UI primitives
```

Never import across features except through `@storik/shared` or a feature's public `index.ts`.

---

## 2. Hexagonal Architecture (Ports & Adapters)

The domain core has **zero infrastructure dependencies**. Infra adapts to the domain, never the reverse.

- **Port** — interface defined inside `domain/` or `application/`
- **Adapter** — concrete implementation in `infrastructure/`

**API:** Effect `Layer` is the DI mechanism. Wire adapters in `main.ts` only (composition root).

```ts
// infrastructure/SqliteTaskRepository.ts — adapter
export const SqliteTaskRepositoryLive: Layer.Layer<TaskRepository> = ...

// main.ts — composition root only
const AppLive = Layer.mergeAll(SqliteTaskRepositoryLive, ...)
```

**Web:** React components are UI adapters. Hooks are the port boundary — components only call hooks, never fetch APIs directly.

---

## 3. Domain-Driven Design (DDD)

Every feature has a `domain/` layer with no external imports (only Effect + `@storik/shared` schemas).

| DDD concept     | Implementation                                              |
|-----------------|-------------------------------------------------------------|
| Entity          | `class Task { readonly id: TaskId; ... }`                  |
| Value Object    | `Schema.Struct` with branded type via Effect Schema         |
| Aggregate Root  | Entity that owns its invariants and emits domain events     |
| Repository      | Interface in `domain/`, implementation in `infrastructure/` |
| Domain Service  | Pure Effect function operating only on domain types         |

Define schemas in `@storik/shared` only when the type crosses the API/web boundary.

---

## 4. CQRS (Command/Query Separation)

Every operation is a **Command** (mutates state) or a **Query** (reads state). Never mix them.

```
features/tasks/application/
  commands/
    CreateTask.ts    # Command type + Effect handler
    UpdateTask.ts
  queries/
    GetTask.ts       # Query type + Effect handler
    ListTasks.ts
```

**Command handler:**
```ts
export interface CreateTaskCommand { title: string; projectId: ProjectId }
export const handleCreateTask = (cmd: CreateTaskCommand): Effect.Effect<Task, TaskError, TaskRepository> =>
  TaskRepository.pipe(Effect.flatMap(repo => repo.save(Task.create(cmd))))
```

**Query handler:**
```ts
export interface ListTasksQuery { projectId: ProjectId }
export const handleListTasks = (q: ListTasksQuery): Effect.Effect<Task[], never, TaskRepository> =>
  TaskRepository.pipe(Effect.flatMap(repo => repo.findByProject(q.projectId)))
```

HTTP routes in `router.ts` call handlers — they contain no logic themselves.

**Web:** mutations → `useMutation` hook (POST/PATCH), reads → `useQuery` hook. Never merge them.

---

## 5. TDD (Test-Driven Development)

Follow **red → green → refactor**. Write the failing test first, then minimum implementation.

Use the `/tdd` skill for guided TDD workflows.

**Test placement:**
```
features/tasks/
  domain/Task.test.ts                         # pure unit — no Effect runtime
  application/CreateTask.test.ts              # Effect.runPromise + in-memory repo
  infrastructure/SqliteTaskRepository.test.ts # integration, real SQLite
```

**Web:** co-locate tests next to components. Use `@testing-library/react` + `happy-dom`. Test behavior, not implementation.

Never skip a failing test — fix or document with `it.todo`.
