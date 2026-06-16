import { defineConfig, devices } from "@playwright/test"

const repoRoot = __dirname
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:5173"
const apiCommand = [
  "CI=1 pnpm db:reset",
  [
    "pnpm --filter @bucketdrive/api exec wrangler --config ../../wrangler.toml dev --port 8787 --inspector-port 0",
    "--var E2E_TEST_AUTH:true",
    "--var BETTER_AUTH_SECRET:e2e-secret-for-playwright-runs-32chars",
    "--var R2_ACCESS_KEY_ID:e2e-access-key",
    "--var R2_SECRET_ACCESS_KEY:e2e-secret-key",
    "--var R2_ENDPOINT:https://r2.example.com",
    "--log-level warn",
  ].join(" "),
].join(" && ")

export default defineConfig({
  testDir: "apps/web/e2e",
  testMatch: "**/*.spec.ts",
  testIgnore:
    process.env.PLAYWRIGHT_INCLUDE_BENCHMARKS === "true" ? undefined : "**/*.benchmark.spec.ts",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: apiCommand,
      cwd: repoRoot,
      url: "http://127.0.0.1:8787/api/health",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: "pnpm --filter @bucketdrive/web dev --host 127.0.0.1",
      cwd: repoRoot,
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
})
