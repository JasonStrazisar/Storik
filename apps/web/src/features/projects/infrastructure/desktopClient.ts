import type {
  ActiveProjectResponse,
  ArchiveProjectPayload,
  CreateProjectPayload,
  DesktopCommandError,
  Project,
  RenameProjectPayload,
  RestoreProjectPayload,
  SelectProjectPayload,
} from "@storik/shared"

const DEFAULT_ERROR = "Desktop command failed"
const BROWSER_PROJECTS_KEY = "storik.projects.v1"
const BROWSER_ACTIVE_KEY = "storik.activeProjectId.v1"

function toCommandError(error: unknown): DesktopCommandError {
  if (typeof error === "object" && error !== null) {
    const maybeMessage = "message" in error ? (error as { message?: unknown }).message : undefined
    const maybeCode = "code" in error ? (error as { code?: unknown }).code : undefined
    return {
      code: typeof maybeCode === "string" ? maybeCode : undefined,
      message: typeof maybeMessage === "string" ? maybeMessage : DEFAULT_ERROR,
    }
  }

  if (typeof error === "string") {
    return { message: error }
  }

  return { message: DEFAULT_ERROR }
}

function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window
}

async function invokeTauri<TResponse>(command: string, payload?: Record<string, unknown>): Promise<TResponse> {
  if (!isTauriRuntime()) {
    throw new Error("Tauri runtime not available")
  }

  const runtime = (window as unknown as {
    __TAURI_INTERNALS__?: { invoke?: (cmd: string, args?: Record<string, unknown>) => Promise<unknown> }
  }).__TAURI_INTERNALS__

  if (!runtime?.invoke) {
    throw new Error("Tauri invoke is not available")
  }

  return (await runtime.invoke(command, payload)) as TResponse
}

function nowIso(): string {
  return new Date().toISOString()
}

function validateName(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) throw Object.assign(new Error("Project name must not be empty"), { code: "validation" })
  if (trimmed.length > 80) {
    throw Object.assign(new Error("Project name must be 80 characters or less"), { code: "validation" })
  }
  return trimmed
}

function validatePath(path: string): void {
  if (!path.startsWith("/")) {
    throw Object.assign(new Error("Path must be absolute"), { code: "path_validation" })
  }
}

function readProjects(): Project[] {
  if (typeof localStorage === "undefined") return []
  const raw = localStorage.getItem(BROWSER_PROJECTS_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as Project[]) : []
  } catch {
    return []
  }
}

function writeProjects(projects: Project[]) {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(BROWSER_PROJECTS_KEY, JSON.stringify(projects))
  }
}

function readActiveProjectId(): string | null {
  if (typeof localStorage === "undefined") return null
  return localStorage.getItem(BROWSER_ACTIVE_KEY)
}

function writeActiveProjectId(projectId: string | null) {
  if (typeof localStorage === "undefined") return
  if (projectId === null) {
    localStorage.removeItem(BROWSER_ACTIVE_KEY)
    return
  }
  localStorage.setItem(BROWSER_ACTIVE_KEY, projectId)
}

function randomId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `proj-${crypto.randomUUID()}`
  }
  return `proj-${Date.now()}-${Math.floor(Math.random() * 100000)}`
}

function browserListProjects(): Project[] {
  return readProjects().filter((p) => p.status === "active")
}

function browserListArchivedProjects(): Project[] {
  return readProjects().filter((p) => p.status === "archived")
}

function browserGetActiveProject(): ActiveProjectResponse {
  const activeProjectId = readActiveProjectId()
  if (!activeProjectId) return { status: "onboarding-required" }

  const project = readProjects().find((p) => p.id === activeProjectId && p.status === "active")
  if (!project) {
    writeActiveProjectId(null)
    return { status: "onboarding-required" }
  }

  return { status: "active", project }
}

function browserCreateProject(payload: CreateProjectPayload): Project {
  const name = validateName(payload.name)
  validatePath(payload.path)

  const projects = readProjects()
  if (projects.some((p) => p.path === payload.path)) {
    throw Object.assign(new Error("A project with this path already exists"), { code: "duplicate_path" })
  }

  const now = nowIso()
  const created: Project = {
    id: randomId() as any,
    name,
    path: payload.path,
    status: "active",
    createdAt: now,
    updatedAt: now,
  }

  writeProjects([...projects, created])
  writeActiveProjectId(created.id)

  return created
}

function browserSelectActiveProject(payload: SelectProjectPayload): ActiveProjectResponse {
  const project = readProjects().find((p) => p.id === payload.id)
  if (!project) throw Object.assign(new Error(`Project ${payload.id} not found`), { code: "not_found" })
  if (project.status === "archived") {
    throw Object.assign(new Error("Archived project cannot be selected"), { code: "validation" })
  }

  writeActiveProjectId(project.id)
  return { status: "active", project }
}

function browserArchiveProject(payload: ArchiveProjectPayload): Project {
  const projects = readProjects()
  const index = projects.findIndex((p) => p.id === payload.id)
  if (index < 0) throw Object.assign(new Error(`Project ${payload.id} not found`), { code: "not_found" })
  if (projects[index].status === "archived") {
    throw Object.assign(new Error(`Project ${payload.id} is already archived`), { code: "already_archived" })
  }

  const updated: Project = {
    ...projects[index],
    status: "archived",
    updatedAt: nowIso(),
  }
  projects[index] = updated
  writeProjects(projects)

  if (readActiveProjectId() === payload.id) {
    writeActiveProjectId(null)
  }

  return updated
}

function browserRestoreProject(payload: RestoreProjectPayload): Project {
  const projects = readProjects()
  const index = projects.findIndex((p) => p.id === payload.id)
  if (index < 0) throw Object.assign(new Error(`Project ${payload.id} not found`), { code: "not_found" })
  if (projects[index].status === "active") {
    throw Object.assign(new Error(`Project ${payload.id} is already active`), { code: "already_active" })
  }

  const updated: Project = {
    ...projects[index],
    status: "active",
    updatedAt: nowIso(),
  }
  projects[index] = updated
  writeProjects(projects)
  return updated
}

function browserRenameProject(payload: RenameProjectPayload): Project {
  const name = validateName(payload.newName)
  const projects = readProjects()
  const index = projects.findIndex((p) => p.id === payload.id)
  if (index < 0) throw Object.assign(new Error(`Project ${payload.id} not found`), { code: "not_found" })

  const updated: Project = {
    ...projects[index],
    name,
    updatedAt: nowIso(),
  }
  projects[index] = updated
  writeProjects(projects)
  return updated
}

async function invokeCommand<TResponse>(
  command: string,
  payload?: Record<string, unknown>
): Promise<TResponse> {
  if (!isTauriRuntime()) {
    try {
      switch (command) {
        case "list_projects":
          return browserListProjects() as TResponse
        case "list_archived_projects":
          return browserListArchivedProjects() as TResponse
        case "get_active_project":
          return browserGetActiveProject() as TResponse
        case "create_project":
          return browserCreateProject(payload?.payload as CreateProjectPayload) as TResponse
        case "select_active_project":
          return browserSelectActiveProject(payload?.payload as SelectProjectPayload) as TResponse
        case "archive_project":
          return browserArchiveProject(payload?.payload as ArchiveProjectPayload) as TResponse
        case "restore_project":
          return browserRestoreProject(payload?.payload as RestoreProjectPayload) as TResponse
        case "rename_project":
          return browserRenameProject(payload?.payload as RenameProjectPayload) as TResponse
        default:
          throw new Error(`Unsupported command: ${command}`)
      }
    } catch (error) {
      const normalized = toCommandError(error)
      throw Object.assign(new Error(normalized.message), { code: normalized.code })
    }
  }

  try {
    return await invokeTauri<TResponse>(command, payload)
  } catch (error) {
    const normalized = toCommandError(error)
    throw Object.assign(new Error(normalized.message), { code: normalized.code })
  }
}

export const desktopClient = {
  listProjects() {
    return invokeCommand<Project[]>("list_projects")
  },

  listArchivedProjects() {
    return invokeCommand<Project[]>("list_archived_projects")
  },

  getActiveProject() {
    return invokeCommand<ActiveProjectResponse>("get_active_project")
  },

  createProject(payload: CreateProjectPayload) {
    return invokeCommand<Project>("create_project", { payload })
  },

  selectActiveProject(payload: SelectProjectPayload) {
    return invokeCommand<ActiveProjectResponse>("select_active_project", { payload })
  },

  archiveProject(payload: ArchiveProjectPayload) {
    return invokeCommand<Project>("archive_project", { payload })
  },

  restoreProject(payload: RestoreProjectPayload) {
    return invokeCommand<Project>("restore_project", { payload })
  },

  renameProject(payload: RenameProjectPayload) {
    return invokeCommand<Project>("rename_project", { payload })
  },
}
