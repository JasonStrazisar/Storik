import { test, expect } from "@playwright/test"

test.describe("Project Lifecycle E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    await page.evaluate(() => {
      localStorage.clear()
    })
    await page.reload()
  })

  test("Onboarding flow: create first project", async ({ page }) => {
    await expect(page.locator('[data-testid="project-name-input"]')).toBeVisible()
    await expect(page.locator('[data-testid="project-path-input"]')).toBeVisible()

    await page.fill('[data-testid="project-name-input"]', "My E2E Project")
    await page.fill('[data-testid="project-path-input"]', "/tmp/e2e-project")
    await page.click('[data-testid="submit-button"]')

    await expect(page.locator('[data-testid="project-selector"]')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText("My E2E Project")).toBeVisible()
  })

  test("Create and switch projects via selector", async ({ page }) => {
    await page.fill('[data-testid="project-name-input"]', "Project A")
    await page.fill('[data-testid="project-path-input"]', "/tmp/e2e-project-a")
    await page.click('[data-testid="submit-button"]')

    await expect(page.locator('[data-testid="project-selector"]')).toBeVisible({ timeout: 5000 })

    await page.click('[data-testid="add-project-button"]')
    await page.fill('[data-testid="create-name-input"]', "Project B")
    await page.fill('[data-testid="create-path-input"]', "/tmp/e2e-project-b")
    await page.click('[data-testid="create-submit"]')

    await expect(page.getByText("Project A")).toBeVisible()
    await expect(page.getByText("Project B")).toBeVisible()
  })
})
