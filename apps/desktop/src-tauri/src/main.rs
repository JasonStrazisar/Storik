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

#[derive(Debug, Serialize)]
#[serde(untagged)]
enum ActiveProjectResponse {
    Active { status: &'static str, project: Project },
    OnboardingRequired { status: &'static str },
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
            pick_project_directory,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

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
}
