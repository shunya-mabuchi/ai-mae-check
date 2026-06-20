import { spawnSync } from "node:child_process";
import { assertRuleDeliveryReleaseConfig, loadRuleDeliveryReleaseConfig } from "./lib/rule-delivery-release-config.mjs";

const releaseConfig = assertRuleDeliveryReleaseConfig(loadRuleDeliveryReleaseConfig());

const result = spawnSync("pnpm", ["--filter", "@ai-mae-check/core", "build"], {
  stdio: "inherit",
  shell: process.platform === "win32"
});

if (result.error) {
  throw result.error;
}

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const llmBuild = spawnSync("pnpm", ["--filter", "@ai-mae-check/llm", "build"], {
  stdio: "inherit",
  shell: process.platform === "win32"
});

if (llmBuild.error) {
  throw llmBuild.error;
}

if (llmBuild.status !== 0) {
  process.exit(llmBuild.status ?? 1);
}

const zip = spawnSync("pnpm", ["--filter", "@ai-mae-check/extension", "zip"], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: {
    ...process.env,
    VITE_RULE_DELIVERY_URL: releaseConfig.endpoint
  }
});

if (zip.error) {
  throw zip.error;
}

process.exit(zip.status ?? 1);
