import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3000);
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

// When E2E_BASE_URL points at an already-running server (local dev or a
// deployed env) we skip booting our own web server.
const useExternalServer = Boolean(process.env.E2E_BASE_URL);

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }], ["list"]]
    : [["html", { open: "never" }], ["list"]],
  outputDir: "test-results",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Allow muted autoplay without a user gesture so the YouTube playout
        // starts in headless runs (the playback spec relies on this).
        launchOptions: { args: ["--autoplay-policy=no-user-gesture-required"] },
      },
    },
    { name: "mobile-chrome", use: { ...devices["Pixel 7"] } },
  ],
  webServer: useExternalServer
    ? undefined
    : {
        // Build + start is closer to production than `next dev` and avoids the
        // dev-only compile-on-first-request latency that flakes E2E.
        command: "npm run build && npm run start -- --port " + PORT,
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        stdout: "pipe",
        stderr: "pipe",
      },
});
