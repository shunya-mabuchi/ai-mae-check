import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:4174",
    trace: "on-first-retry"
  },
  webServer: {
    command: "node e2e/serve-mock-composer.mjs",
    url: "http://127.0.0.1:4174/mock-composer.html",
    reuseExistingServer: !process.env.CI
  }
});
