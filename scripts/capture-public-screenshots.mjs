import { spawnSync } from "node:child_process";

function run(command, args, extraEnv = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: {
      ...process.env,
      ...extraEnv
    }
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run("pnpm", ["build:extension:e2e"]);
run("pnpm", [
  "exec",
  "playwright",
  "test",
  "apps/extension/e2e/visual-assets.spec.ts",
  "--config",
  "apps/extension/playwright.extension.config.ts"
], {
  CAPTURE_EXTENSION_SCREENSHOTS: "1",
  EXTENSION_E2E: "1"
});

run("pnpm", [
  "--filter",
  "@ai-mae-check/site",
  "exec",
  "playwright",
  "test",
  "tests/visual-assets.spec.ts",
  "--config",
  "playwright.config.ts"
], {
  CAPTURE_SITE_SCREENSHOTS: "1"
});

run("pnpm", ["assets:brand"]);
