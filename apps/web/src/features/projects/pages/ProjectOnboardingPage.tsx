import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useCreateProject } from "../hooks/useProjectMutations"
import type { CreateProjectPayload } from "@storik/shared"

export function ProjectOnboardingPage() {
  const navigate = useNavigate()
  const createMutation = useCreateProject()
  const [formData, setFormData] = useState({ name: "", path: "" })
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      await createMutation.mutateAsync(formData as CreateProjectPayload)
      navigate({ to: "/" })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    }
  }

  return (
    <div>
      <h1>Create Your First Project</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Project name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          disabled={createMutation.isPending}
          data-testid="project-name-input"
        />
        <input
          type="text"
          placeholder="Project path"
          value={formData.path}
          onChange={(e) => setFormData({ ...formData, path: e.target.value })}
          disabled={createMutation.isPending}
          data-testid="project-path-input"
        />
        {error && <div data-testid="error-message">{error}</div>}
        <button type="submit" disabled={createMutation.isPending} data-testid="submit-button">
          {createMutation.isPending ? "Creating..." : "Create Project"}
        </button>
      </form>
    </div>
  )
}
