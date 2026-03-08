import { useState, type FormEvent } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useCreateProject } from "../hooks/useProjectMutations"
import type { CreateProjectPayload } from "@storik/shared"
import { Input } from "../../../components/ui/Input"
import { Button } from "../../../components/ui/Button"
import { desktopClient } from "../infrastructure/desktopClient"

export function ProjectOnboardingPage() {
  const [name, setName] = useState("")
  const [path, setPath] = useState("")
  const [isPickingPath, setIsPickingPath] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const createProject = useCreateProject()
  const navigate = useNavigate()

  const handlePickPath = async () => {
    if (createProject.isPending || isPickingPath) {
      return
    }

    setIsPickingPath(true)
    try {
      const selectedPath = await desktopClient.pickProjectDirectory()
      if (selectedPath) {
        setPath(selectedPath)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to open project directory picker"
      setErrorMessage(message)
    } finally {
      setIsPickingPath(false)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage(null)

    try {
      await createProject.mutateAsync({ name, path } as CreateProjectPayload)
      navigate({ to: "/" })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create project"
      setErrorMessage(message)
    }
  }

  return (
    <div data-testid="onboarding-page" className="grid min-h-screen grid-cols-1 bg-white md:grid-cols-2">
      <section className="flex flex-[1_0_0] self-stretch flex-col items-start justify-center gap-8 bg-white px-16 py-[10px]">
        <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
          <div className="flex flex-col items-start gap-0 self-stretch">
            <h1 className="text-2xl leading-8 font-semibold not-italic text-gray-900 [font-family:Inter]">
              Create your first project
            </h1>
            <p className="text-base leading-6 font-normal not-italic text-gray-700 [font-family:Inter]">
              Create your first project to get started.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col justify-center items-end gap-2">
            <div className="flex flex-col items-start gap-1.5 self-stretch">
              <label htmlFor="project-name" className="text-sm leading-5 font-medium text-gray-700">
                Name <span className="text-brand-600">*</span>
              </label>
              <Input
                id="project-name"
                data-testid="project-name-input"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Project name"
                required
                disabled={createProject.isPending}
              />
            </div>
            <div className="flex flex-col items-start gap-1.5 self-stretch">
              <label htmlFor="project-path" className="text-sm leading-5 font-medium text-gray-700">
                Repository <span className="text-brand-600">*</span>
              </label>
              <Input
                id="project-path"
                data-testid="project-path-input"
                type="text"
                value={path}
                readOnly
                onClick={handlePickPath}
                placeholder="Absolute project path"
                required
                disabled={createProject.isPending || isPickingPath}
                className="cursor-pointer"
              />
            </div>
            <Button data-testid="submit-button" type="submit" disabled={createProject.isPending}>
              <span className="flex items-center justify-center px-0.5">Continue</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M4.16669 10H15.8334M15.8334 10L10 4.16669M15.8334 10L10 15.8334"
                  stroke="currentColor"
                  strokeWidth="1.66667"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Button>
            {errorMessage ? (
              <p data-testid="error-message" className="text-sm text-red-600">
                {errorMessage}
              </p>
            ) : null}
          </form>
        </div>
      </section>

      <aside aria-hidden="true" className="hidden bg-brand-50 md:block" />
    </div>
  )
}
