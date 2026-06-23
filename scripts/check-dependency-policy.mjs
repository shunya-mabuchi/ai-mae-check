import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = resolve(".");
const paths = {
  rootPackage: "package.json",
  lockfile: "pnpm-lock.yaml",
  policy: "docs/dependency-maintenance.md",
  licensePolicy: "docs/license-policy.md",
  modelPolicy: "docs/webllm-model-policy.md",
  workflow: ".github/workflows/ci.yml"
};

function fail(message) {
  throw new Error(`dependency policy QA failed: ${message}`);
}

function read(relativePath) {
  return readFileSync(resolve(rootDir, relativePath), "utf8");
}

function assertIncludes(text, needle, context) {
  if (!text.includes(needle)) {
    fail(`${context} must include: ${needle}`);
  }
}

for (const path of Object.values(paths)) {
  if (!existsSync(resolve(rootDir, path))) {
    fail(`${path} is missing`);
  }
}

const rootPackage = JSON.parse(read(paths.rootPackage));
const policy = read(paths.policy);
const licensePolicy = read(paths.licensePolicy);
const modelPolicy = read(paths.modelPolicy);
const workflow = read(paths.workflow);

if (rootPackage.packageManager !== "pnpm@10.12.1") {
  fail("packageManager must stay pinned to pnpm@10.12.1");
}

if (rootPackage.license !== "MIT") {
  fail("root package license must be MIT");
}

for (const command of [
  "pnpm install --frozen-lockfile",
  "pnpm outdated",
  "pnpm licenses list --json",
  "pnpm audit",
  "pnpm qa:public-repo",
  "pnpm qa:public-docs",
  "pnpm qa:webllm-model-policy",
  "pnpm qa:extension:size",
  "pnpm qa:extension:manifest",
  "pnpm qa:chrome-store"
]) {
  assertIncludes(policy, command, paths.policy);
}

for (const term of ["@mlc-ai/web-llm", "WXT", "Vite", "React", "Playwright", "Wrangler", "pnpm-lock.yaml"]) {
  assertIncludes(policy, term, paths.policy);
}

for (const licenseName of ["MIT", "Apache-2.0", "MPL-2.0", "CC-BY-4.0"]) {
  assertIncludes(policy, licenseName, paths.policy);
}

assertIncludes(licensePolicy, "第三者ライブラリ", paths.licensePolicy);
assertIncludes(modelPolicy, "Llama 3.2 Community License", paths.modelPolicy);
assertIncludes(workflow, "pnpm qa:public-repo", paths.workflow);
assertIncludes(workflow, "pnpm qa:chrome-store", paths.workflow);

console.log("dependency policy QA passed");
