import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = resolve(".");

const paths = {
  rootPackage: "package.json",
  extensionPackage: "apps/extension/package.json",
  changelog: "CHANGELOG.md",
  releaseProcess: "docs/release-process.md",
  chromeStoreRelease: "docs/chrome-web-store-release.md",
  ruleDeliveryPlan: "docs/release-0.1.1-rule-delivery-plan.md",
  readme: "README.md"
};

function fail(message) {
  throw new Error(`release policy QA failed: ${message}`);
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
const extensionPackage = JSON.parse(read(paths.extensionPackage));
const changelog = read(paths.changelog);
const releaseProcess = read(paths.releaseProcess);
const chromeStoreRelease = read(paths.chromeStoreRelease);
const ruleDeliveryPlan = read(paths.ruleDeliveryPlan);
const readme = read(paths.readme);

if (rootPackage.version !== extensionPackage.version) {
  fail(`root package version (${rootPackage.version}) must match extension version (${extensionPackage.version})`);
}

for (const text of [changelog, releaseProcess, ruleDeliveryPlan]) {
  assertIncludes(text, rootPackage.version, "release docs");
}

for (const command of [
  "pnpm package:extension",
  "pnpm qa:public-repo",
  "pnpm qa:public-docs",
  "pnpm qa:privacy-regression",
  "pnpm qa:webllm-model-policy",
  "pnpm qa:dependency-policy",
  "pnpm qa:demo:seo",
  "pnpm qa:extension:size",
  "pnpm qa:extension:manifest",
  "pnpm qa:chrome-store"
]) {
  assertIncludes(releaseProcess, command, paths.releaseProcess);
}

for (const phrase of ["残Issueをすべて解消", "ZIPを先にアップロードしません", "GitHub Release", "Chrome Web Store"]) {
  assertIncludes(releaseProcess, phrase, paths.releaseProcess);
}

assertIncludes(changelog, "## Unreleased", paths.changelog);
assertIncludes(changelog, "## 0.1.0 - 2026-06-20", paths.changelog);
assertIncludes(chromeStoreRelease, "pnpm qa:extension:size", paths.chromeStoreRelease);
assertIncludes(ruleDeliveryPlan, "残Issueをすべて解消", paths.ruleDeliveryPlan);
assertIncludes(readme, "CHANGELOG.md", paths.readme);

console.log("release policy QA passed");
