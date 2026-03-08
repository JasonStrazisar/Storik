import { useArchivedProjectList } from "../hooks/useProjectQueries"
import { useRestoreProject } from "../hooks/useProjectMutations"
import { ProjectStatusBadge } from "../components/ProjectStatusBadge"

export function ArchivedProjectsPage() {
  const { data: archivedProjects, isLoading } = useArchivedProjectList()
  const restoreMutation = useRestoreProject()

  const handleRestore = (id: string) => {
    restoreMutation.mutate({ id })
  }

  if (isLoading) return <div data-testid="loading">Loading archived projects...</div>

  return (
    <div data-testid="archived-projects-page">
      <h2>Archived Projects</h2>

      {archivedProjects && archivedProjects.length > 0 ? (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #ddd" }}>
              <th style={{ textAlign: "left", padding: "8px" }}>Name</th>
              <th style={{ textAlign: "left", padding: "8px" }}>Path</th>
              <th style={{ textAlign: "left", padding: "8px" }}>Status</th>
              <th style={{ textAlign: "left", padding: "8px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {archivedProjects.map((project) => (
              <tr key={project.id} data-testid={`archived-project-${project.id}`} style={{ borderBottom: "1px solid #ddd" }}>
                <td style={{ padding: "8px" }}>{project.name}</td>
                <td style={{ padding: "8px" }}>{project.path}</td>
                <td style={{ padding: "8px" }}>
                  <ProjectStatusBadge status="archived" />
                </td>
                <td style={{ padding: "8px" }}>
                  <button
                    onClick={() => handleRestore(project.id)}
                    disabled={restoreMutation.isPending}
                    data-testid={`restore-button-${project.id}`}
                  >
                    Restore
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No archived projects</p>
      )}
    </div>
  )
}
