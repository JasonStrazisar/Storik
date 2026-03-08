import { test, expect } from "@playwright/test"

test("homepage loads", async ({ page }) => {
  await page.goto("/")
  await expect(page.locator("body")).toBeVisible()
  await expect(page.locator("text=Storik")).toBeVisible()
})
