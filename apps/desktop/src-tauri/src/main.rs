#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use chrono::{SecondsFormat, Utc};
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::Manager;
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_dialog::FilePath;
use uuid::Uuid;

#[derive(Debug, Serialize)]
struct CommandError {
    code: &'static str,
    message: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct Project {
    id: String,
    name: String,
    path: String,
    status: String,
    created_at: String,
    updated_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateProjectPayload {
    name: String,
    path: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SelectProjectPayload {
    id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RenameProjectPayload {
    id: String,
    new_name: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ArchiveProjectPayload {
    id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RestoreProjectPayload {
    id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RunHarnessAuditPayload {
    project_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ListHarnessAuditHistoryPayload {
    project_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SetHarnessGateOverridePayload {
    project_id: String,
    reason: String,
}

#[derive(Debug, Serialize)]
#[serde(untagged)]
enum ActiveProjectResponse {
    Active { status: &'static str, project: Project },
    OnboardingRequired { status: &'static str },
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct HarnessProfile {
    policy_version: String,
    context_files: Vec<String>,
    skill_files: Vec<String>,
    tooling_files: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct HarnessScore {
    global: i64,
    context: i64,
    skills: i64,
    tools_mcp: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct HarnessEvidence {
    file_path: String,
    excerpt: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct HarnessFinding {
    id: String,
    severity: String,
    dimension: String,
    title: String,
    description: String,
    evidence: Vec<HarnessEvidence>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct HarnessAction {
    id: String,
    priority: String,
    effort: String,
    impact: String,
    title: String,
    description: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct HarnessGate {
    threshold: i64,
    requires_override: bool,
    triggered_by_p0: bool,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct HarnessAuditResult {
    project_id: String,
    scanned_at: String,
    profile: HarnessProfile,
    score: HarnessScore,
    findings: Vec<HarnessFinding>,
    actions: Vec<HarnessAction>,
    gate: HarnessGate,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct HarnessFindingCounts {
    p0: i64,
    p1: i64,
    p2: i64,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct HarnessAuditHistoryEntry {
    project_id: String,
    scanned_at: String,
    global_score: i64,
    dimension_scores: HarnessDimensionScores,
    finding_counts: HarnessFindingCounts,
    requires_override: bool,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct HarnessDimensionScores {
    context: i64,
    skills: i64,
    tools_mcp: i64,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct HarnessGateStatus {
    project_id: String,
    requires_override: bool,
    overridden_at: Option<String>,
    override_reason: Option<String>,
}

#[derive(Default)]
struct AppState {
    db_path: Mutex<Option<PathBuf>>,
}

fn command_error(code: &'static str, message: impl Into<String>) -> CommandError {
    CommandError {
        code,
        message: message.into(),
    }
}

fn now_iso() -> String {
    Utc::now().to_rfc3339_opts(SecondsFormat::Secs, true)
}

fn validate_name(raw: &str) -> Result<String, CommandError> {
    let name = raw.trim();
    if name.is_empty() {
        return Err(command_error("validation", "Project name must not be empty"));
    }
    if name.len() > 80 {
        return Err(command_error("validation", "Project name must be 80 characters or less"));
    }
    Ok(name.to_string())
}

fn validate_path(path: &str) -> Result<(), CommandError> {
    if !path.starts_with('/') {
        return Err(command_error("path_validation", "Path must be absolute"));
    }
    Ok(())
}

fn normalize_selected_directory(path: Option<FilePath>) -> Option<String> {
    path.and_then(|selected| {
        selected
            .into_path()
            .ok()
            .map(|directory| directory.to_string_lossy().to_string())
    })
}

fn init_db(db_path: &Path) -> Result<(), CommandError> {
    if let Some(parent) = db_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| command_error("database", format!("Failed to create app data directory: {e}")))?;
    }

    let conn = Connection::open(db_path)
        .map_err(|e| command_error("database", format!("Failed to open database: {e}")))?;

    conn.execute_batch(
        r#"
        PRAGMA journal_mode = WAL;

        CREATE TABLE IF NOT EXISTS projects (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          path TEXT NOT NULL UNIQUE,
          status TEXT NOT NULL CHECK(status IN ('active', 'archived')),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS app_state (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS harness_audit_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project_id TEXT NOT NULL,
          scanned_at TEXT NOT NULL,
          global_score INTEGER NOT NULL,
          context_score INTEGER NOT NULL,
          skills_score INTEGER NOT NULL,
          tools_mcp_score INTEGER NOT NULL,
          p0_count INTEGER NOT NULL,
          p1_count INTEGER NOT NULL,
          p2_count INTEGER NOT NULL,
          requires_override INTEGER NOT NULL,
          triggered_by_p0 INTEGER NOT NULL,
          profile_json TEXT NOT NULL,
          score_json TEXT NOT NULL,
          findings_json TEXT NOT NULL,
          actions_json TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS harness_gate_overrides (
          project_id TEXT PRIMARY KEY,
          reason TEXT NOT NULL,
          overridden_at TEXT NOT NULL
        );
        "#,
    )
    .map_err(|e| command_error("database", format!("Failed to run migrations: {e}")))?;

    Ok(())
}

fn get_db_path(state: &tauri::State<AppState>) -> Result<PathBuf, CommandError> {
    let guard = state
        .db_path
        .lock()
        .map_err(|_| command_error("database", "Failed to acquire database lock"))?;

    guard
        .clone()
        .ok_or_else(|| command_error("database", "Database not initialized"))
}

fn with_connection<T>(state: &tauri::State<AppState>, f: impl FnOnce(&Connection) -> Result<T, CommandError>) -> Result<T, CommandError> {
    let db_path = get_db_path(state)?;
    let conn = Connection::open(db_path)
        .map_err(|e| command_error("database", format!("Failed to open database: {e}")))?;
    f(&conn)
}

fn row_to_project(row: &rusqlite::Row<'_>) -> rusqlite::Result<Project> {
    Ok(Project {
        id: row.get(0)?,
        name: row.get(1)?,
        path: row.get(2)?,
        status: row.get(3)?,
        created_at: row.get(4)?,
        updated_at: row.get(5)?,
    })
}

fn get_project_by_id(conn: &Connection, id: &str) -> Result<Option<Project>, CommandError> {
    conn.query_row(
        "SELECT id, name, path, status, created_at, updated_at FROM projects WHERE id = ?1",
        params![id],
        row_to_project,
    )
    .optional()
    .map_err(|e| command_error("database", format!("Failed to load project: {e}")))
}

fn list_projects_by_status(conn: &Connection, status: &str) -> Result<Vec<Project>, CommandError> {
    let mut stmt = conn
        .prepare(
            "SELECT id, name, path, status, created_at, updated_at FROM projects WHERE status = ?1 ORDER BY created_at ASC",
        )
        .map_err(|e| command_error("database", format!("Failed to prepare list query: {e}")))?;

    let projects = stmt
        .query_map(params![status], row_to_project)
        .map_err(|e| command_error("database", format!("Failed to query projects: {e}")))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| command_error("database", format!("Failed to decode projects: {e}")))?;

    Ok(projects)
}

fn set_active_project_id(conn: &Connection, project_id: &str) -> Result<(), CommandError> {
    conn.execute(
        "INSERT INTO app_state (key, value) VALUES ('active_project_id', ?1) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        params![project_id],
    )
    .map_err(|e| command_error("database", format!("Failed to set active project: {e}")))?;
    Ok(())
}

fn clear_active_project_id(conn: &Connection) -> Result<(), CommandError> {
    conn.execute("DELETE FROM app_state WHERE key = 'active_project_id'", [])
        .map_err(|e| command_error("database", format!("Failed to clear active project: {e}")))?;
    Ok(())
}

fn get_active_project_id(conn: &Connection) -> Result<Option<String>, CommandError> {
    conn.query_row(
        "SELECT value FROM app_state WHERE key = 'active_project_id'",
        [],
        |row| row.get::<_, String>(0),
    )
    .optional()
    .map_err(|e| command_error("database", format!("Failed to read active project: {e}")))
}

fn create_project_impl(conn: &Connection, payload: CreateProjectPayload) -> Result<Project, CommandError> {
    let name = validate_name(&payload.name)?;
    validate_path(&payload.path)?;

    let duplicate = conn
        .query_row(
            "SELECT id FROM projects WHERE path = ?1",
            params![payload.path],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|e| command_error("database", format!("Failed to check duplicate path: {e}")))?;

    if duplicate.is_some() {
        return Err(command_error("duplicate_path", "A project with this path already exists"));
    }

    let id = format!("proj-{}", Uuid::new_v4().simple());
    let now = now_iso();

    conn.execute(
        "INSERT INTO projects (id, name, path, status, created_at, updated_at) VALUES (?1, ?2, ?3, 'active', ?4, ?5)",
        params![id, name, payload.path, now, now],
    )
    .map_err(|e| command_error("database", format!("Failed to create project: {e}")))?;

    set_active_project_id(conn, &id)?;

    get_project_by_id(conn, &id)?.ok_or_else(|| command_error("database", "Project was created but could not be loaded"))
}

fn select_active_project_impl(conn: &Connection, payload: SelectProjectPayload) -> Result<ActiveProjectResponse, CommandError> {
    let project = get_project_by_id(conn, &payload.id)?
        .ok_or_else(|| command_error("not_found", format!("Project {} not found", payload.id)))?;

    if project.status == "archived" {
        return Err(command_error("validation", "Archived project cannot be selected"));
    }

    set_active_project_id(conn, &payload.id)?;

    Ok(ActiveProjectResponse::Active {
        status: "active",
        project,
    })
}

fn archive_project_impl(conn: &Connection, payload: ArchiveProjectPayload) -> Result<Project, CommandError> {
    let project = get_project_by_id(conn, &payload.id)?
        .ok_or_else(|| command_error("not_found", format!("Project {} not found", payload.id)))?;

    if project.status == "archived" {
        return Err(command_error("already_archived", format!("Project {} is already archived", payload.id)));
    }

    let now = now_iso();
    conn.execute(
        "UPDATE projects SET status = 'archived', updated_at = ?2 WHERE id = ?1",
        params![payload.id, now],
    )
    .map_err(|e| command_error("database", format!("Failed to archive project: {e}")))?;

    if get_active_project_id(conn)? == Some(payload.id.clone()) {
        clear_active_project_id(conn)?;
    }

    get_project_by_id(conn, &payload.id)?.ok_or_else(|| command_error("database", "Archived project could not be loaded"))
}

fn restore_project_impl(conn: &Connection, payload: RestoreProjectPayload) -> Result<Project, CommandError> {
    let project = get_project_by_id(conn, &payload.id)?
        .ok_or_else(|| command_error("not_found", format!("Project {} not found", payload.id)))?;

    if project.status == "active" {
        return Err(command_error("already_active", format!("Project {} is already active", payload.id)));
    }

    let now = now_iso();
    conn.execute(
        "UPDATE projects SET status = 'active', updated_at = ?2 WHERE id = ?1",
        params![payload.id, now],
    )
    .map_err(|e| command_error("database", format!("Failed to restore project: {e}")))?;

    get_project_by_id(conn, &payload.id)?.ok_or_else(|| command_error("database", "Restored project could not be loaded"))
}

fn rename_project_impl(conn: &Connection, payload: RenameProjectPayload) -> Result<Project, CommandError> {
    let new_name = validate_name(&payload.new_name)?;

    let exists = get_project_by_id(conn, &payload.id)?;
    if exists.is_none() {
        return Err(command_error("not_found", format!("Project {} not found", payload.id)));
    }

    let now = now_iso();
    conn.execute(
        "UPDATE projects SET name = ?2, updated_at = ?3 WHERE id = ?1",
        params![payload.id, new_name, now],
    )
    .map_err(|e| command_error("database", format!("Failed to rename project: {e}")))?;

    get_project_by_id(conn, &payload.id)?.ok_or_else(|| command_error("database", "Renamed project could not be loaded"))
}

fn get_active_project_impl(conn: &Connection) -> Result<ActiveProjectResponse, CommandError> {
    let Some(active_id) = get_active_project_id(conn)? else {
        return Ok(ActiveProjectResponse::OnboardingRequired {
            status: "onboarding-required",
        });
    };

    let Some(project) = get_project_by_id(conn, &active_id)? else {
        clear_active_project_id(conn)?;
        return Ok(ActiveProjectResponse::OnboardingRequired {
            status: "onboarding-required",
        });
    };

    if project.status == "archived" {
        clear_active_project_id(conn)?;
        return Ok(ActiveProjectResponse::OnboardingRequired {
            status: "onboarding-required",
        });
    }

    Ok(ActiveProjectResponse::Active {
        status: "active",
        project,
    })
}

fn score_from_presence(present: bool) -> i64 {
    if present {
        100
    } else {
        30
    }
}

fn read_excerpt(path: &Path) -> Option<String> {
    let content = fs::read_to_string(path).ok()?;
    content
        .lines()
        .map(str::trim)
        .find(|line| !line.is_empty())
        .map(|line| line.chars().take(120).collect())
}

fn relative_to_project(project_path: &Path, file_path: &Path) -> String {
    file_path
        .strip_prefix(project_path)
        .ok()
        .map(|path| path.to_string_lossy().to_string())
        .unwrap_or_else(|| file_path.to_string_lossy().to_string())
}

fn collect_harness_profile(project_path: &Path) -> Result<HarnessProfile, CommandError> {
    if !project_path.exists() || !project_path.is_dir() {
        return Err(command_error(
            "path_validation",
            format!("Project path does not exist or is not a directory: {}", project_path.to_string_lossy()),
        ));
    }

    let mut context_files = Vec::new();
    let mut skill_files = Vec::new();
    let mut tooling_files = Vec::new();

    fn visit_dir(
        project_path: &Path,
        current: &Path,
        context_files: &mut Vec<String>,
        skill_files: &mut Vec<String>,
        tooling_files: &mut Vec<String>,
    ) {
        let Ok(entries) = fs::read_dir(current) else {
            return;
        };

        for entry in entries.flatten() {
            let path = entry.path();
            let file_name = entry.file_name().to_string_lossy().to_lowercase();

            if path.is_dir() {
                if matches!(
                    file_name.as_str(),
                    ".git" | "node_modules" | "target" | "dist" | ".next" | ".turbo"
                ) {
                    continue;
                }
                visit_dir(project_path, &path, context_files, skill_files, tooling_files);
                continue;
            }

            if file_name == "claude.md" || file_name == "agents.md" {
                context_files.push(relative_to_project(project_path, &path));
                continue;
            }

            if file_name == "skill.md" {
                skill_files.push(relative_to_project(project_path, &path));
                continue;
            }

            let is_tooling_file = matches!(
                file_name.as_str(),
                "mcp.json"
                    | "mcp.yaml"
                    | "mcp.yml"
                    | ".mcp.json"
                    | "tools.json"
                    | "tools.yaml"
                    | "tools.yml"
            ) || (file_name.contains("mcp")
                && (file_name.ends_with(".json") || file_name.ends_with(".yaml") || file_name.ends_with(".yml")));

            if is_tooling_file {
                tooling_files.push(relative_to_project(project_path, &path));
            }
        }
    }

    visit_dir(
        project_path,
        project_path,
        &mut context_files,
        &mut skill_files,
        &mut tooling_files,
    );

    context_files.sort();
    skill_files.sort();
    tooling_files.sort();

    Ok(HarnessProfile {
        policy_version: "harness-policy-v1".to_string(),
        context_files,
        skill_files,
        tooling_files,
    })
}

fn latest_audit_gate_requirement(conn: &Connection, project_id: &str) -> Result<bool, CommandError> {
    conn.query_row(
        "SELECT requires_override FROM harness_audit_history WHERE project_id = ?1 ORDER BY scanned_at DESC LIMIT 1",
        params![project_id],
        |row| row.get::<_, i64>(0),
    )
    .optional()
    .map(|value| value.unwrap_or(0) != 0)
    .map_err(|e| command_error("database", format!("Failed to read latest harness audit: {e}")))
}

fn read_gate_override(conn: &Connection, project_id: &str) -> Result<Option<(String, String)>, CommandError> {
    conn.query_row(
        "SELECT reason, overridden_at FROM harness_gate_overrides WHERE project_id = ?1",
        params![project_id],
        |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)),
    )
    .optional()
    .map_err(|e| command_error("database", format!("Failed to read harness gate override: {e}")))
}

fn get_harness_gate_status_impl(
    conn: &Connection,
    payload: ListHarnessAuditHistoryPayload,
) -> Result<HarnessGateStatus, CommandError> {
    let exists = get_project_by_id(conn, &payload.project_id)?;
    if exists.is_none() {
        return Err(command_error(
            "not_found",
            format!("Project {} not found", payload.project_id),
        ));
    }

    let requires_override = latest_audit_gate_requirement(conn, &payload.project_id)?;
    let override_entry = read_gate_override(conn, &payload.project_id)?;

    Ok(HarnessGateStatus {
        project_id: payload.project_id,
        requires_override: requires_override && override_entry.is_none(),
        overridden_at: override_entry.as_ref().map(|(_, overridden_at)| overridden_at.clone()),
        override_reason: override_entry.as_ref().map(|(reason, _)| reason.clone()),
    })
}

fn run_harness_audit_impl(conn: &Connection, payload: RunHarnessAuditPayload) -> Result<HarnessAuditResult, CommandError> {
    let project = get_project_by_id(conn, &payload.project_id)?
        .ok_or_else(|| command_error("not_found", format!("Project {} not found", payload.project_id)))?;

    let project_path = PathBuf::from(&project.path);
    let profile = collect_harness_profile(&project_path)?;

    let has_context = !profile.context_files.is_empty();
    let has_skills = !profile.skill_files.is_empty();
    let has_tools = !profile.tooling_files.is_empty();

    let mut findings = Vec::new();
    let mut actions = Vec::new();

    if !has_context {
        findings.push(HarnessFinding {
            id: "missing-context".to_string(),
            severity: "P0".to_string(),
            dimension: "context".to_string(),
            title: "Missing agent context files".to_string(),
            description: "No CLAUDE.md or AGENTS.md was detected in this project.".to_string(),
            evidence: vec![HarnessEvidence {
                file_path: project.path.clone(),
                excerpt: None,
            }],
        });
        actions.push(HarnessAction {
            id: "create-context".to_string(),
            priority: "P0".to_string(),
            effort: "S".to_string(),
            impact: "high".to_string(),
            title: "Add CLAUDE.md or AGENTS.md".to_string(),
            description: "Define coding constraints, tool usage, and project-specific guidance for agents.".to_string(),
        });
    }

    if !has_skills {
        findings.push(HarnessFinding {
            id: "missing-skills".to_string(),
            severity: "P1".to_string(),
            dimension: "skills".to_string(),
            title: "No project skills found".to_string(),
            description: "No SKILL.md files were detected for reusable agent workflows.".to_string(),
            evidence: vec![HarnessEvidence {
                file_path: project.path.clone(),
                excerpt: None,
            }],
        });
        actions.push(HarnessAction {
            id: "define-skills".to_string(),
            priority: "P1".to_string(),
            effort: "M".to_string(),
            impact: "medium".to_string(),
            title: "Define project skills".to_string(),
            description: "Add skill definitions for recurring tasks to improve agent consistency.".to_string(),
        });
    }

    if !has_tools {
        findings.push(HarnessFinding {
            id: "missing-tools-mcp".to_string(),
            severity: "P1".to_string(),
            dimension: "tools_mcp".to_string(),
            title: "No tools/MCP configuration found".to_string(),
            description: "No MCP or tool configuration file was detected.".to_string(),
            evidence: vec![HarnessEvidence {
                file_path: project.path.clone(),
                excerpt: None,
            }],
        });
        actions.push(HarnessAction {
            id: "define-tools-mcp".to_string(),
            priority: "P1".to_string(),
            effort: "M".to_string(),
            impact: "medium".to_string(),
            title: "Define tools/MCP setup".to_string(),
            description: "Add explicit MCP/tooling configuration for predictable agent execution.".to_string(),
        });
    }

    if has_context {
        let evidences = profile
            .context_files
            .iter()
            .map(|relative| {
                let full_path = project_path.join(relative);
                HarnessEvidence {
                    file_path: relative.clone(),
                    excerpt: read_excerpt(&full_path),
                }
            })
            .collect::<Vec<_>>();

        findings.push(HarnessFinding {
            id: "context-present".to_string(),
            severity: "P2".to_string(),
            dimension: "context".to_string(),
            title: "Context files detected".to_string(),
            description: "Agent context files are present and included in the harness profile.".to_string(),
            evidence: evidences,
        });
    }

    let context_score = score_from_presence(has_context);
    let skills_score = score_from_presence(has_skills);
    let tools_score = score_from_presence(has_tools);
    let global_score = (context_score + skills_score + tools_score) / 3;
    let threshold = 70;
    let triggered_by_p0 = findings.iter().any(|finding| finding.severity == "P0");
    let requires_override = global_score < threshold || triggered_by_p0;

    let score = HarnessScore {
        global: global_score,
        context: context_score,
        skills: skills_score,
        tools_mcp: tools_score,
    };

    let gate = HarnessGate {
        threshold,
        requires_override,
        triggered_by_p0,
    };

    let scanned_at = now_iso();
    let result = HarnessAuditResult {
        project_id: payload.project_id.clone(),
        scanned_at: scanned_at.clone(),
        profile,
        score,
        findings,
        actions,
        gate,
    };

    let p0_count = result.findings.iter().filter(|finding| finding.severity == "P0").count() as i64;
    let p1_count = result.findings.iter().filter(|finding| finding.severity == "P1").count() as i64;
    let p2_count = result.findings.iter().filter(|finding| finding.severity == "P2").count() as i64;

    let profile_json = serde_json::to_string(&result.profile)
        .map_err(|e| command_error("serialization", format!("Failed to encode profile: {e}")))?;
    let score_json = serde_json::to_string(&result.score)
        .map_err(|e| command_error("serialization", format!("Failed to encode score: {e}")))?;
    let findings_json = serde_json::to_string(&result.findings)
        .map_err(|e| command_error("serialization", format!("Failed to encode findings: {e}")))?;
    let actions_json = serde_json::to_string(&result.actions)
        .map_err(|e| command_error("serialization", format!("Failed to encode actions: {e}")))?;

    conn.execute(
        "INSERT INTO harness_audit_history (project_id, scanned_at, global_score, context_score, skills_score, tools_mcp_score, p0_count, p1_count, p2_count, requires_override, triggered_by_p0, profile_json, score_json, findings_json, actions_json)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)",
        params![
            result.project_id,
            scanned_at,
            result.score.global,
            result.score.context,
            result.score.skills,
            result.score.tools_mcp,
            p0_count,
            p1_count,
            p2_count,
            if result.gate.requires_override { 1 } else { 0 },
            if result.gate.triggered_by_p0 { 1 } else { 0 },
            profile_json,
            score_json,
            findings_json,
            actions_json
        ],
    )
    .map_err(|e| command_error("database", format!("Failed to persist harness audit: {e}")))?;

    conn.execute(
        "DELETE FROM harness_gate_overrides WHERE project_id = ?1",
        params![payload.project_id],
    )
    .map_err(|e| command_error("database", format!("Failed to reset harness gate override: {e}")))?;

    Ok(result)
}

fn list_harness_audit_history_impl(
    conn: &Connection,
    payload: ListHarnessAuditHistoryPayload,
) -> Result<Vec<HarnessAuditHistoryEntry>, CommandError> {
    let exists = get_project_by_id(conn, &payload.project_id)?;
    if exists.is_none() {
        return Err(command_error(
            "not_found",
            format!("Project {} not found", payload.project_id),
        ));
    }

    let mut stmt = conn
        .prepare(
            "SELECT project_id, scanned_at, global_score, context_score, skills_score, tools_mcp_score, p0_count, p1_count, p2_count, requires_override
             FROM harness_audit_history
             WHERE project_id = ?1
             ORDER BY scanned_at DESC
             LIMIT 50",
        )
        .map_err(|e| command_error("database", format!("Failed to prepare harness history query: {e}")))?;

    let rows = stmt
        .query_map(params![payload.project_id], |row| {
            Ok(HarnessAuditHistoryEntry {
                project_id: row.get(0)?,
                scanned_at: row.get(1)?,
                global_score: row.get(2)?,
                dimension_scores: HarnessDimensionScores {
                    context: row.get(3)?,
                    skills: row.get(4)?,
                    tools_mcp: row.get(5)?,
                },
                finding_counts: HarnessFindingCounts {
                    p0: row.get(6)?,
                    p1: row.get(7)?,
                    p2: row.get(8)?,
                },
                requires_override: row.get::<_, i64>(9)? != 0,
            })
        })
        .map_err(|e| command_error("database", format!("Failed to query harness history: {e}")))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| command_error("database", format!("Failed to decode harness history: {e}")))
}

fn set_harness_gate_override_impl(
    conn: &Connection,
    payload: SetHarnessGateOverridePayload,
) -> Result<HarnessGateStatus, CommandError> {
    let exists = get_project_by_id(conn, &payload.project_id)?;
    if exists.is_none() {
        return Err(command_error(
            "not_found",
            format!("Project {} not found", payload.project_id),
        ));
    }

    let reason = payload.reason.trim();
    if reason.len() < 5 || reason.len() > 500 {
        return Err(command_error(
            "validation",
            "Override reason must be between 5 and 500 characters",
        ));
    }

    let overridden_at = now_iso();
    conn.execute(
        "INSERT INTO harness_gate_overrides (project_id, reason, overridden_at) VALUES (?1, ?2, ?3)
         ON CONFLICT(project_id) DO UPDATE SET reason = excluded.reason, overridden_at = excluded.overridden_at",
        params![payload.project_id, reason, overridden_at],
    )
    .map_err(|e| command_error("database", format!("Failed to set harness gate override: {e}")))?;

    Ok(HarnessGateStatus {
        project_id: payload.project_id,
        requires_override: false,
        overridden_at: Some(overridden_at),
        override_reason: Some(reason.to_string()),
    })
}

#[tauri::command]
fn list_projects(state: tauri::State<AppState>) -> Result<Vec<Project>, CommandError> {
    with_connection(&state, |conn| list_projects_by_status(conn, "active"))
}

#[tauri::command]
fn list_archived_projects(state: tauri::State<AppState>) -> Result<Vec<Project>, CommandError> {
    with_connection(&state, |conn| list_projects_by_status(conn, "archived"))
}

#[tauri::command]
fn get_active_project(state: tauri::State<AppState>) -> Result<ActiveProjectResponse, CommandError> {
    with_connection(&state, get_active_project_impl)
}

#[tauri::command]
fn create_project(state: tauri::State<AppState>, payload: CreateProjectPayload) -> Result<Project, CommandError> {
    with_connection(&state, |conn| create_project_impl(conn, payload))
}

#[tauri::command]
fn select_active_project(
    state: tauri::State<AppState>,
    payload: SelectProjectPayload,
) -> Result<ActiveProjectResponse, CommandError> {
    with_connection(&state, |conn| select_active_project_impl(conn, payload))
}

#[tauri::command]
fn archive_project(state: tauri::State<AppState>, payload: ArchiveProjectPayload) -> Result<Project, CommandError> {
    with_connection(&state, |conn| archive_project_impl(conn, payload))
}

#[tauri::command]
fn restore_project(state: tauri::State<AppState>, payload: RestoreProjectPayload) -> Result<Project, CommandError> {
    with_connection(&state, |conn| restore_project_impl(conn, payload))
}

#[tauri::command]
fn rename_project(state: tauri::State<AppState>, payload: RenameProjectPayload) -> Result<Project, CommandError> {
    with_connection(&state, |conn| rename_project_impl(conn, payload))
}

#[tauri::command]
fn run_harness_audit(
    state: tauri::State<AppState>,
    payload: RunHarnessAuditPayload,
) -> Result<HarnessAuditResult, CommandError> {
    with_connection(&state, |conn| run_harness_audit_impl(conn, payload))
}

#[tauri::command]
fn list_harness_audit_history(
    state: tauri::State<AppState>,
    payload: ListHarnessAuditHistoryPayload,
) -> Result<Vec<HarnessAuditHistoryEntry>, CommandError> {
    with_connection(&state, |conn| list_harness_audit_history_impl(conn, payload))
}

#[tauri::command]
fn set_harness_gate_override(
    state: tauri::State<AppState>,
    payload: SetHarnessGateOverridePayload,
) -> Result<HarnessGateStatus, CommandError> {
    with_connection(&state, |conn| set_harness_gate_override_impl(conn, payload))
}

#[tauri::command]
fn get_harness_gate_status(
    state: tauri::State<AppState>,
    payload: ListHarnessAuditHistoryPayload,
) -> Result<HarnessGateStatus, CommandError> {
    with_connection(&state, |conn| get_harness_gate_status_impl(conn, payload))
}

#[tauri::command]
async fn pick_project_directory(app: tauri::AppHandle) -> Result<Option<String>, CommandError> {
    let (sender, mut receiver) = tauri::async_runtime::channel(1);
    app.dialog().file().pick_folder(move |folder| {
        let _ = sender.try_send(folder);
    });

    let selected_directory = receiver
        .recv()
        .await
        .ok_or_else(|| command_error("dialog", "Failed to receive directory picker selection"))?;

    Ok(normalize_selected_directory(selected_directory))
}

fn main() {
    tauri::Builder::default()
        .manage(AppState::default())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_data_dir()
                .map_err(|e| format!("Failed to resolve app data directory: {e}"))?;
            let db_path = app_data_dir.join("storik.sqlite3");

            init_db(&db_path).map_err(|e| format!("{}: {}", e.code, e.message))?;

            let state = app.state::<AppState>();
            let mut guard = state
                .db_path
                .lock()
                .map_err(|_| "Failed to acquire app state lock".to_string())?;
            *guard = Some(db_path);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            list_projects,
            list_archived_projects,
            get_active_project,
            create_project,
            select_active_project,
            archive_project,
            restore_project,
            rename_project,
            run_harness_audit,
            list_harness_audit_history,
            set_harness_gate_override,
            get_harness_gate_status,
            pick_project_directory,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;
    use std::io::Write;

    fn setup_conn() -> (tempfile::TempDir, Connection) {
        let dir = tempdir().expect("tempdir");
        let db_path = dir.path().join("test.sqlite3");
        init_db(&db_path).expect("init db");
        let conn = Connection::open(db_path).expect("open db");
        (dir, conn)
    }

    #[test]
    fn create_and_get_active_project() {
        let (_dir, conn) = setup_conn();

        let created = create_project_impl(
            &conn,
            CreateProjectPayload {
                name: "Alpha".to_string(),
                path: "/tmp/alpha".to_string(),
            },
        )
        .expect("create project");

        let active = get_active_project_impl(&conn).expect("active query");
        match active {
            ActiveProjectResponse::Active { project, .. } => assert_eq!(project.id, created.id),
            ActiveProjectResponse::OnboardingRequired { .. } => panic!("expected active project"),
        }
    }

    #[test]
    fn archive_restore_and_select_flow() {
        let (_dir, conn) = setup_conn();

        let a = create_project_impl(
            &conn,
            CreateProjectPayload {
                name: "A".to_string(),
                path: "/tmp/a".to_string(),
            },
        )
        .expect("create a");

        let b = create_project_impl(
            &conn,
            CreateProjectPayload {
                name: "B".to_string(),
                path: "/tmp/b".to_string(),
            },
        )
        .expect("create b");

        let _ = select_active_project_impl(&conn, SelectProjectPayload { id: a.id.clone() }).expect("select a");

        let archived = archive_project_impl(&conn, ArchiveProjectPayload { id: a.id.clone() }).expect("archive a");
        assert_eq!(archived.status, "archived");

        let restored = restore_project_impl(&conn, RestoreProjectPayload { id: a.id.clone() }).expect("restore a");
        assert_eq!(restored.status, "active");

        let _ = select_active_project_impl(&conn, SelectProjectPayload { id: b.id.clone() }).expect("select b");

        let active = get_active_project_impl(&conn).expect("active b");
        match active {
            ActiveProjectResponse::Active { project, .. } => assert_eq!(project.id, b.id),
            ActiveProjectResponse::OnboardingRequired { .. } => panic!("expected active project"),
        }
    }

    #[test]
    fn rename_project_updates_name() {
        let (_dir, conn) = setup_conn();

        let created = create_project_impl(
            &conn,
            CreateProjectPayload {
                name: "Old".to_string(),
                path: "/tmp/old".to_string(),
            },
        )
        .expect("create project");

        let renamed = rename_project_impl(
            &conn,
            RenameProjectPayload {
                id: created.id,
                new_name: "New".to_string(),
            },
        )
        .expect("rename project");

        assert_eq!(renamed.name, "New");
    }

    #[test]
    fn normalize_selected_directory_returns_none_for_cancelled_picker() {
        let normalized = normalize_selected_directory(None);
        assert_eq!(normalized, None);
    }

    #[test]
    fn normalize_selected_directory_returns_string_for_selected_path() {
        let normalized = normalize_selected_directory(Some(FilePath::Path(PathBuf::from("/tmp/storik"))));
        assert_eq!(normalized, Some("/tmp/storik".to_string()));
    }

    #[test]
    fn sqlite_persists_across_reopen() {
        let dir = tempdir().expect("tempdir");
        let db_path = dir.path().join("persist.sqlite3");
        init_db(&db_path).expect("init db");

        {
            let conn = Connection::open(&db_path).expect("open db first");
            let created = create_project_impl(
                &conn,
                CreateProjectPayload {
                    name: "Persisted".to_string(),
                    path: "/tmp/persisted".to_string(),
                },
            )
            .expect("create project");
            assert!(!created.id.is_empty());
        }

        {
            let conn = Connection::open(&db_path).expect("open db second");
            let projects = list_projects_by_status(&conn, "active").expect("list active");
            assert_eq!(projects.len(), 1);

            let active = get_active_project_impl(&conn).expect("get active");
            match active {
                ActiveProjectResponse::Active { project, .. } => {
                    assert_eq!(project.name, "Persisted");
                }
                ActiveProjectResponse::OnboardingRequired { .. } => panic!("expected active project"),
            }
        }
    }

    fn write_file(path: &Path, content: &str) {
        let parent = path.parent().expect("parent");
        fs::create_dir_all(parent).expect("create dir");
        let mut file = fs::File::create(path).expect("create file");
        file.write_all(content.as_bytes()).expect("write file");
    }

    #[test]
    fn harness_audit_reports_missing_context_as_p0() {
        let (_dir, conn) = setup_conn();
        let project_dir = tempdir().expect("project dir");

        let project = create_project_impl(
            &conn,
            CreateProjectPayload {
                name: "Harness Missing".to_string(),
                path: project_dir.path().to_string_lossy().to_string(),
            },
        )
        .expect("create project");

        let result = run_harness_audit_impl(
            &conn,
            RunHarnessAuditPayload {
                project_id: project.id.clone(),
            },
        )
        .expect("run harness audit");

        assert!(result.findings.iter().any(|finding| finding.severity == "P0"));
        assert!(result.gate.requires_override);
        assert!(result.score.global < 70);

        let history = list_harness_audit_history_impl(
            &conn,
            ListHarnessAuditHistoryPayload {
                project_id: project.id,
            },
        )
        .expect("history");
        assert_eq!(history.len(), 1);
    }

    #[test]
    fn harness_audit_passes_when_context_skills_and_tools_exist() {
        let (_dir, conn) = setup_conn();
        let project_dir = tempdir().expect("project dir");

        write_file(&project_dir.path().join("AGENTS.md"), "# Rules\n");
        write_file(&project_dir.path().join(".agents/skills/tdd/SKILL.md"), "# TDD\n");
        write_file(&project_dir.path().join("mcp.json"), "{ \"mcp\": true }\n");

        let project = create_project_impl(
            &conn,
            CreateProjectPayload {
                name: "Harness Complete".to_string(),
                path: project_dir.path().to_string_lossy().to_string(),
            },
        )
        .expect("create project");

        let result = run_harness_audit_impl(
            &conn,
            RunHarnessAuditPayload {
                project_id: project.id.clone(),
            },
        )
        .expect("run harness audit");

        assert_eq!(result.score.global, 100);
        assert!(!result.gate.requires_override);
        assert!(!result.profile.context_files.is_empty());
        assert!(!result.profile.skill_files.is_empty());
        assert!(!result.profile.tooling_files.is_empty());

        let status = get_harness_gate_status_impl(
            &conn,
            ListHarnessAuditHistoryPayload {
                project_id: project.id,
            },
        )
        .expect("status");
        assert!(!status.requires_override);
    }

    #[test]
    fn harness_gate_override_is_persisted() {
        let (_dir, conn) = setup_conn();
        let project_dir = tempdir().expect("project dir");

        let project = create_project_impl(
            &conn,
            CreateProjectPayload {
                name: "Override".to_string(),
                path: project_dir.path().to_string_lossy().to_string(),
            },
        )
        .expect("create project");

        let _ = run_harness_audit_impl(
            &conn,
            RunHarnessAuditPayload {
                project_id: project.id.clone(),
            },
        )
        .expect("run audit");

        let override_status = set_harness_gate_override_impl(
            &conn,
            SetHarnessGateOverridePayload {
                project_id: project.id.clone(),
                reason: "Risk accepted while we migrate harness files".to_string(),
            },
        )
        .expect("set override");

        assert!(!override_status.requires_override);
        assert!(override_status.overridden_at.is_some());

        let status = get_harness_gate_status_impl(
            &conn,
            ListHarnessAuditHistoryPayload {
                project_id: project.id,
            },
        )
        .expect("status");
        assert!(!status.requires_override);
        assert_eq!(
            status.override_reason.as_deref(),
            Some("Risk accepted while we migrate harness files")
        );
    }
}
