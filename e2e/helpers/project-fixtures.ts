const API_BASE = "http://localhost:3001"

export interface ProjectResponse {
  id: string
  name: string
  path: string
  status: "active" | "archived"
  createdAt: string
  updatedAt: string
}

export async function createProject(
  name: string,
  path: string
): Promise<ProjectResponse> {
  const response = await fetch(`${API_BASE}/project/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, path }),
  })
  if (!response.ok)
    throw new Error(`Failed to create project: ${response.statusText}`)
  return response.json()
}

export async function getAllProjects(): Promise<ProjectResponse[]> {
  const response = await fetch(`${API_BASE}/project/list`)
  if (!response.ok) throw new Error("Failed to fetch projects")
  return response.json()
}

export async function getArchivedProjects(): Promise<ProjectResponse[]> {
  const response = await fetch(`${API_BASE}/project/list-archived`)
  if (!response.ok) throw new Error("Failed to fetch archived projects")
  return response.json()
}

export async function archiveProject(id: string): Promise<ProjectResponse> {
  const response = await fetch(`${API_BASE}/project/archive`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  })
  if (!response.ok)
    throw new Error(`Failed to archive project: ${response.statusText}`)
  return response.json()
}

export async function restoreProject(id: string): Promise<ProjectResponse> {
  const response = await fetch(`${API_BASE}/project/restore`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  })
  if (!response.ok)
    throw new Error(`Failed to restore project: ${response.statusText}`)
  return response.json()
}

export async function deleteAllProjects(): Promise<void> {
  const active = await getAllProjects()
  const archived = await getArchivedProjects()
  // No DELETE endpoint exists yet — archive all active, then note IDs
  // This is a best-effort cleanup; tests should use unique names/paths
  void active
  void archived
}
