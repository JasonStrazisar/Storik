import type {
  ActiveProjectResponse,
  ArchiveProjectPayload,
  CreateProjectPayload,
  DesktopCommandError,
  HarnessAuditHistoryEntry,
  HarnessAuditResult,
  HarnessAction,
  HarnessFinding,
  HarnessGateStatus,
  ListHarnessAuditHistoryPayload,
  Project,
  RenameProjectPayload,
  RunHarnessAuditPayload,
  SetHarnessGateOverridePayload,
  RestoreProjectPayload,
  SelectProjectPayload,
} from "@storik/shared"

const DEFAULT_ERROR = "Desktop command failed"
const BROWSER_PROJECTS_KEY = "storik.projects.v1"
const BROWSER_ACTIVE_KEY = "storik.activeProjectId.v1"
const BROWSER_AUDIT_HISTORY_KEY = "storik.harness.auditHistory.v1"
const BROWSER_GATE_OVERRIDE_KEY = "storik.harness.gateOverride.v1"

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

function readAuditHistory(): HarnessAuditResult[] {
  if (typeof localStorage === "undefined") return []
  const raw = localStorage.getItem(BROWSER_AUDIT_HISTORY_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as HarnessAuditResult[]) : []
  } catch {
    return []
  }
}

function writeAuditHistory(items: HarnessAuditResult[]) {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(BROWSER_AUDIT_HISTORY_KEY, JSON.stringify(items))
  }
}

type GateOverride = { reason: string; overriddenAt: string }

function readGateOverrides(): Record<string, GateOverride> {
  if (typeof localStorage === "undefined") return {}
  const raw = localStorage.getItem(BROWSER_GATE_OVERRIDE_KEY)
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, GateOverride>) : {}
  } catch {
    return {}
  }
}

function writeGateOverrides(value: Record<string, GateOverride>) {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(BROWSER_GATE_OVERRIDE_KEY, JSON.stringify(value))
  }
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

function scoreFromBoolean(ok: boolean): number {
  return ok ? 100 : 30
}

function toHistoryEntry(result: HarnessAuditResult): HarnessAuditHistoryEntry {
  const p0 = result.findings.filter((f) => f.severity === "P0").length
  const p1 = result.findings.filter((f) => f.severity === "P1").length
  const p2 = result.findings.filter((f) => f.severity === "P2").length
  return {
    projectId: result.projectId,
    scannedAt: result.scannedAt,
    globalScore: result.score.global,
    dimensionScores: {
      context: result.score.context,
      skills: result.score.skills,
      toolsMcp: result.score.toolsMcp,
    },
    findingCounts: { p0, p1, p2 },
    requiresOverride: result.gate.requiresOverride,
  }
}

function browserRunHarnessAudit(payload: RunHarnessAuditPayload): HarnessAuditResult {
  const project = readProjects().find((p) => p.id === payload.projectId)
  if (!project) {
    throw Object.assign(new Error(`Project ${payload.projectId} not found`), { code: "not_found" })
  }

  const profile = {
    policyVersion: "harness-policy-v1",
    contextFiles: [] as string[],
    skillFiles: [] as string[],
    toolingFiles: [] as string[],
  }

  const hasContext = profile.contextFiles.length > 0
  const hasSkills = profile.skillFiles.length > 0
  const hasTools = profile.toolingFiles.length > 0

  const findings: HarnessFinding[] = []
  const actions: HarnessAction[] = []
  if (!hasContext) {
    findings.push({
      id: "missing-context",
      severity: "P0",
      dimension: "context",
      title: "Missing agent context files",
      description: "No CLAUDE.md or AGENTS.md detected.",
      evidence: [{ filePath: project.path }],
    })
    actions.push({
      id: "create-context",
      priority: "P0",
      effort: "S",
      impact: "high",
      title: "Add CLAUDE.md or AGENTS.md",
      description: "Define execution guardrails, coding rules, and project expectations.",
    })
  }
  if (!hasSkills) {
    findings.push({
      id: "missing-skills",
      severity: "P1",
      dimension: "skills",
      title: "No project skills detected",
      description: "No SKILL.md files were discovered.",
      evidence: [{ filePath: project.path }],
    })
    actions.push({
      id: "define-skills",
      priority: "P1",
      effort: "M",
      impact: "medium",
      title: "Define project skills",
      description: "Create explicit reusable skills for repeated agent workflows.",
    })
  }
  if (!hasTools) {
    findings.push({
      id: "missing-tooling",
      severity: "P1",
      dimension: "tools_mcp",
      title: "No tooling/MCP config detected",
      description: "No MCP/tools configuration files were discovered.",
      evidence: [{ filePath: project.path }],
    })
    actions.push({
      id: "define-tooling",
      priority: "P1",
      effort: "M",
      impact: "medium",
      title: "Define tools/MCP setup",
      description: "Document and configure toolchains available to agents.",
    })
  }

  const contextScore = scoreFromBoolean(hasContext)
  const skillsScore = scoreFromBoolean(hasSkills)
  const toolsScore = scoreFromBoolean(hasTools)
  const global = Math.round((contextScore + skillsScore + toolsScore) / 3)
  const gateTriggeredByP0 = findings.some((f) => f.severity === "P0")
  const requiresOverride = global < 70 || gateTriggeredByP0

  const result: HarnessAuditResult = {
    projectId: payload.projectId,
    scannedAt: nowIso(),
    profile,
    score: {
      global,
      context: contextScore,
      skills: skillsScore,
      toolsMcp: toolsScore,
    },
    findings,
    actions,
    gate: {
      threshold: 70,
      requiresOverride,
      triggeredByP0: gateTriggeredByP0,
    },
  }

  const current = readAuditHistory()
  writeAuditHistory([result, ...current])

  const overrides = readGateOverrides()
  delete overrides[payload.projectId]
  writeGateOverrides(overrides)

  return result
}

function browserListHarnessAuditHistory(payload: ListHarnessAuditHistoryPayload): HarnessAuditHistoryEntry[] {
  return readAuditHistory()
    .filter((entry) => entry.projectId === payload.projectId)
    .map(toHistoryEntry)
}

function browserSetHarnessGateOverride(payload: SetHarnessGateOverridePayload): HarnessGateStatus {
  const project = readProjects().find((p) => p.id === payload.projectId)
  if (!project) {
    throw Object.assign(new Error(`Project ${payload.projectId} not found`), { code: "not_found" })
  }

  const reason = payload.reason.trim()
  if (reason.length < 5) {
    throw Object.assign(new Error("Override reason must contain at least 5 characters"), { code: "validation" })
  }

  const overrides = readGateOverrides()
  overrides[payload.projectId] = { reason, overriddenAt: nowIso() }
  writeGateOverrides(overrides)

  return {
    projectId: payload.projectId,
    requiresOverride: false,
    overriddenAt: overrides[payload.projectId].overriddenAt,
    overrideReason: reason,
  }
}

function browserGetHarnessGateStatus(payload: ListHarnessAuditHistoryPayload): HarnessGateStatus {
  const lastAudit = readAuditHistory().find((entry) => entry.projectId === payload.projectId)
  const override = readGateOverrides()[payload.projectId]
  const requiresOverride = !!lastAudit?.gate.requiresOverride && !override
  return {
    projectId: payload.projectId,
    requiresOverride,
    overriddenAt: override?.overriddenAt ?? null,
    overrideReason: override?.reason ?? null,
  }
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
        case "pick_project_directory":
          return null as TResponse
        case "run_harness_audit":
          return browserRunHarnessAudit(payload?.payload as RunHarnessAuditPayload) as TResponse
        case "list_harness_audit_history":
          return browserListHarnessAuditHistory(payload?.payload as ListHarnessAuditHistoryPayload) as TResponse
        case "set_harness_gate_override":
          return browserSetHarnessGateOverride(payload?.payload as SetHarnessGateOverridePayload) as TResponse
        case "get_harness_gate_status":
          return browserGetHarnessGateStatus(payload?.payload as ListHarnessAuditHistoryPayload) as TResponse
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

  pickProjectDirectory() {
    return invokeCommand<string | null>("pick_project_directory")
  },

  runHarnessAudit(payload: RunHarnessAuditPayload) {
    return invokeCommand<HarnessAuditResult>("run_harness_audit", { payload })
  },

  listHarnessAuditHistory(payload: ListHarnessAuditHistoryPayload) {
    return invokeCommand<HarnessAuditHistoryEntry[]>("list_harness_audit_history", { payload })
  },

  setHarnessGateOverride(payload: SetHarnessGateOverridePayload) {
    return invokeCommand<HarnessGateStatus>("set_harness_gate_override", { payload })
  },

  getHarnessGateStatus(payload: ListHarnessAuditHistoryPayload) {
    return invokeCommand<HarnessGateStatus>("get_harness_gate_status", { payload })
  },
}
