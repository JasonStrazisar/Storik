import { useState, type FormEvent } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useCreateProject } from "../hooks/useProjectMutations"
import type { CreateProjectPayload } from "@storik/shared"
import { css } from "../../../../styled-system/css"

export function ProjectOnboardingPage() {
  const [name, setName] = useState("")
  const [path, setPath] = useState("")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const createProject = useCreateProject()
  const navigate = useNavigate()

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
    <div
      data-testid="onboarding-page"
      className={css({
        minH: "100vh",
        display: "grid",
        gridTemplateColumns: { base: "1fr", md: "1fr 1fr" },
        bg: "bg.primary",
      })}
    >
      <section
        className={css({
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          px: { base: "6", md: "12" },
          py: { base: "8", md: "12" },
          bg: "bg.primary",
        })}
      >
        <div
          className={css({
            width: "100%",
            maxW: "lg",
            display: "flex",
            flexDirection: "column",
            gap: "6",
          })}
        >
          <div className={css({ display: "flex", flexDirection: "column", gap: "2" })}>
            <h1 className={css({ fontSize: "text-xl", fontWeight: "semibold", color: "text.primary" })}>
              Create your first project
            </h1>
            <p className={css({ fontSize: "text-sm", color: "text.secondary" })}>
              Create your first project to get started.
            </p>
          </div>

          <form onSubmit={handleSubmit} className={css({ display: "flex", flexDirection: "column", gap: "4" })}>
            <input
              className={css({
                h: "12",
                px: "4",
                borderWidth: "1px",
                borderStyle: "solid",
                borderColor: "border.primary",
                borderRadius: "md",
                bg: "bg.primary",
                color: "text.primary",
                fontSize: "text-sm",
                _placeholder: { color: "text.placeholder" },
                _focusVisible: {
                  outline: "2px solid",
                  outlineColor: "border.brand",
                  outlineOffset: "2px",
                },
                _disabled: {
                  bg: "bg.disabled",
                  color: "text.disabled",
                  cursor: "not-allowed",
                },
              })}
              data-testid="project-name-input"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Project name"
              disabled={createProject.isPending}
            />
            <input
              className={css({
                h: "12",
                px: "4",
                borderWidth: "1px",
                borderStyle: "solid",
                borderColor: "border.primary",
                borderRadius: "md",
                bg: "bg.primary",
                color: "text.primary",
                fontSize: "text-sm",
                _placeholder: { color: "text.placeholder" },
                _focusVisible: {
                  outline: "2px solid",
                  outlineColor: "border.brand",
                  outlineOffset: "2px",
                },
                _disabled: {
                  bg: "bg.disabled",
                  color: "text.disabled",
                  cursor: "not-allowed",
                },
              })}
              data-testid="project-path-input"
              type="text"
              value={path}
              onChange={(event) => setPath(event.target.value)}
              placeholder="Absolute project path"
              disabled={createProject.isPending}
            />
            <button
              className={css({
                h: "12",
                px: "5",
                borderRadius: "md",
                bg: "bg.brand.solid",
                color: "text.primary.on-brand",
                fontSize: "text-sm",
                fontWeight: "semibold",
                transitionDuration: "normal",
                _hover: { bg: "bg.brand.solid.hover" },
                _disabled: {
                  bg: "bg.disabled",
                  color: "text.disabled",
                  cursor: "not-allowed",
                },
              })}
              data-testid="submit-button"
              type="submit"
              disabled={createProject.isPending}
            >
              {createProject.isPending ? "Creating..." : "Create Project"}
            </button>
            {errorMessage ? (
              <p data-testid="error-message" className={css({ fontSize: "text-sm", color: "text.error.primary" })}>
                {errorMessage}
              </p>
            ) : null}
          </form>
        </div>
      </section>

      <aside
        aria-hidden="true"
        className={css({
          display: { base: "none", md: "block" },
          position: "relative",
          overflow: "hidden",
          bg: "bg.brand.section.subtle",
          backgroundImage:
            "radial-gradient(circle at 18% 24%, var(--colors-bg-brand-primary) 0%, transparent 48%), radial-gradient(circle at 82% 78%, var(--colors-bg-brand-secondary) 0%, transparent 44%)",
          _before: {
            content: '""',
            position: "absolute",
            inset: "10% 14%",
            borderRadius: "2xl",
            bg: "bg.primary.alt",
            opacity: 0.45,
          },
          _after: {
            content: '""',
            position: "absolute",
            inset: "22% 26%",
            borderRadius: "xl",
            bg: "bg.secondary.alt",
            opacity: 0.7,
          },
        })}
      />
    </div>
  )
}
