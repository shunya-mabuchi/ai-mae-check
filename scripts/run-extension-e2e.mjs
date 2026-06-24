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

run("node", ["scripts/build-extension-e2e.mjs"]);
run("pnpm", ["exec", "playwright", "test", "--config", "apps/extension/playwright.extension.config.ts"], {
  EXTENSION_E2E: "1"
});
