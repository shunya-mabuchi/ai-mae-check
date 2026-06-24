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

const e2eEnv = { EXTENSION_E2E: "1" };

run("pnpm", ["--filter", "@ai-mae-check/core", "build"], e2eEnv);
run("pnpm", ["--filter", "@ai-mae-check/llm", "build"], e2eEnv);
run("pnpm", ["--filter", "@ai-mae-check/extension", "build"], e2eEnv);
