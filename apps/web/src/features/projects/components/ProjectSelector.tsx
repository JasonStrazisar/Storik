import { useState } from "react"
import { useProjectList, useActiveProject } from "../hooks/useProjectQueries"
import { useSelectProject, useCreateProject } from "../hooks/useProjectMutations"
import type { CreateProjectPayload } from "@storik/shared"

export function ProjectSelector() {
  const { data: projectList, isLoading } = useProjectList()
  const { data: activeProjectData } = useActiveProject()
  const selectMutation = useSelectProject()
  const createMutation = useCreateProject()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formData, setFormData] = useState({ name: "", path: "" })

  const activeId = activeProjectData?.status === "active" ? activeProjectData.project.id : null

  const handleSelectProject = (id: string) => {
    selectMutation.mutate({ id } as any)
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createMutation.mutateAsync(formData as CreateProjectPayload)
      setShowCreateForm(false)
      setFormData({ name: "", path: "" })
    } catch {
      // Error handled by mutation UI
    }
  }

  if (isLoading) return <div data-testid="selector-loading">Loading projects...</div>

  return (
    <div data-testid="project-selector">
      <h3>Projects</h3>

      {projectList && projectList.length > 0 ? (
        <ul>
          {projectList.map((project) => (
            <li
              key={project.id}
              data-testid={`project-item-${project.id}`}
              style={{
                fontWeight: project.id === activeId ? "bold" : "normal",
              }}
            >
              <button
                onClick={() => handleSelectProject(project.id)}
                disabled={project.id === activeId || selectMutation.isPending}
                data-testid={`select-project-${project.id}`}
              >
                {project.name}
              </button>
              {project.id === activeId && <span data-testid="active-indicator"> (Active)</span>}
            </li>
          ))}
        </ul>
      ) : (
        <p>No active projects</p>
      )}

      {!showCreateForm ? (
        <button onClick={() => setShowCreateForm(true)} data-testid="add-project-button">
          + Add project
        </button>
      ) : (
        <form onSubmit={handleCreateSubmit} data-testid="inline-create-form">
          <input
            type="text"
            placeholder="Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            disabled={createMutation.isPending}
            data-testid="create-name-input"
          />
          <input
            type="text"
            placeholder="Path"
            value={formData.path}
            onChange={(e) => setFormData({ ...formData, path: e.target.value })}
            disabled={createMutation.isPending}
            data-testid="create-path-input"
          />
          <button type="submit" disabled={createMutation.isPending} data-testid="create-submit">
            Create
          </button>
          <button
            type="button"
            onClick={() => {
              setShowCreateForm(false)
              setFormData({ name: "", path: "" })
            }}
            disabled={createMutation.isPending}
            data-testid="create-cancel"
          >
            Cancel
          </button>
        </form>
      )}

      <nav style={{ marginTop: "1rem", borderTop: "1px solid #ddd", paddingTop: "1rem" }}>
        <a href="/projects/archived" data-testid="archived-link">
          View Archived Projects
        </a>
        <br />
        <a href="/harness" data-testid="harness-link">
          Harness Dashboard
        </a>
      </nav>
    </div>
  )
}
