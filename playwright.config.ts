import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  use: { baseURL: "http://localhost:3000" },
  webServer: {
    command: "pnpm dev",
    // Health-check probe only (not used for navigation — tests still use baseURL "/").
    // This app has no "/" route (the marketing home lives on the separate Squarespace
    // vitrine); GET / returns 404, which Playwright's isURLAvailable() rejects
    // (it requires a status in [200, 404)), so the webServer would never be
    // detected as ready. /projet exists and returns 200.
    url: "http://localhost:3000/projet",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
