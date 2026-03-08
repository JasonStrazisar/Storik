import { test, expect } from "@playwright/test"

test("homepage loads", async ({ page }) => {
  await page.goto("/")
  await expect(page.locator("body")).toBeVisible()
  await expect(page.locator('[data-testid="onboarding-page"]')).toBeVisible()
})
