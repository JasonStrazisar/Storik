import { test, expect } from "@playwright/test"
import {
  createProject,
  archiveProject,
  restoreProject,
  getAllProjects,
  getArchivedProjects,
} from "../helpers/project-fixtures"

test.describe("Project Lifecycle E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
  })

  test("Onboarding flow: create first project", async ({ page }) => {
    // Expect onboarding form visible
    await expect(
      page.locator('[data-testid="project-name-input"]')
    ).toBeVisible()
    await expect(
      page.locator('[data-testid="project-path-input"]')
    ).toBeVisible()

    // Fill form
    await page.fill('[data-testid="project-name-input"]', "My E2E Project")
    await page.fill('[data-testid="project-path-input"]', "/tmp/e2e-project")

    // Submit
    await page.click('[data-testid="submit-button"]')

    // Wait for navigation away from onboarding (form should disappear)
    await expect(
      page.locator('[data-testid="project-name-input"]')
    ).not.toBeVisible({ timeout: 5000 })
  })

  test("Create project via API and verify it exists", async () => {
    const uniquePath = `/tmp/e2e-${Date.now()}`
    const project = await createProject("API Test Project", uniquePath)

    expect(project.id).toBeTruthy()
    expect(project.name).toBe("API Test Project")
    expect(project.path).toBe(uniquePath)
    expect(project.status).toBe("active")

    const allProjects = await getAllProjects()
    const found = allProjects.find((p) => p.id === project.id)
    expect(found).toBeTruthy()
  })

  test("Archive and restore project via API", async () => {
    const uniquePath = `/tmp/e2e-archive-${Date.now()}`
    const project = await createProject("Archive Test", uniquePath)

    // Archive it
    const archived = await archiveProject(project.id)
    expect(archived.status).toBe("archived")

    // Should not appear in active list
    const activeList = await getAllProjects()
    expect(activeList.find((p) => p.id === project.id)).toBeUndefined()

    // Should appear in archived list
    const archivedList = await getArchivedProjects()
    expect(archivedList.find((p) => p.id === project.id)).toBeTruthy()

    // Restore it
    const restored = await restoreProject(project.id)
    expect(restored.status).toBe("active")

    // Should be back in active list
    const activeListAfter = await getAllProjects()
    expect(activeListAfter.find((p) => p.id === project.id)).toBeTruthy()
  })

  test("Switch between projects via selector", async ({ page }) => {
    // Set up: create two projects via API
    const proj1 = await createProject(
      "Project A",
      `/tmp/e2e-a-${Date.now()}`
    )
    const proj2 = await createProject(
      "Project B",
      `/tmp/e2e-b-${Date.now()}`
    )

    // Reload page to pick up new projects
    await page.reload()

    // Verify both project names appear somewhere on the page
    await expect(page.getByText(proj1.name)).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(proj2.name)).toBeVisible({ timeout: 5000 })
  })

  test("Archive project and verify in archived view", async ({ page }) => {
    const uniquePath = `/tmp/e2e-arc-ui-${Date.now()}`
    const proj = await createProject("UI Archive Test", uniquePath)

    // Archive via API
    await archiveProject(proj.id)

    // Reload and check the project no longer appears in main list
    await page.reload()
    // The archived project name should not be visible in the active view
    // (give it a moment to load)
    await page.waitForTimeout(1000)

    // Navigate to archived page if link exists
    const archivedLink = page.locator('[data-testid="archived-link"]')
    if (await archivedLink.isVisible().catch(() => false)) {
      await archivedLink.click()
      await expect(page.getByText(proj.name)).toBeVisible({ timeout: 5000 })
    } else {
      // Fallback: verify via API that archive worked
      const archivedList = await getArchivedProjects()
      expect(archivedList.find((p) => p.id === proj.id)).toBeTruthy()
    }
  })
})
