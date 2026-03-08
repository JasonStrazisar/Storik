import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { channel: "chromium" } },
  ],
  webServer: {
    command: "pnpm --filter @storik/web dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    cwd: "..",
  },
})
