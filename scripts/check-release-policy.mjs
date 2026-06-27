import { resolve } from "node:path";
import { createQaContext } from "./lib/qa-helpers.mjs";

const rootDir = resolve(".");
const qa = createQaContext({ rootDir, errorPrefix: "release policy QA failed" });

const paths = {
  rootPackage: "package.json",
  extensionPackage: "apps/extension/package.json",
  changelog: "CHANGELOG.md",
  releaseProcess: "docs/release-process.md",
  chromeStoreRelease: "docs/chrome-web-store-release.md",
  ruleDeliveryPlan: "docs/release-0.1.1-rule-delivery-plan.md",
  releaseDraft011: "docs/releases/v0.1.1.md",
  readme: "README.md"
};

for (const path of Object.values(paths)) {
  qa.assertFileExists(path);
}

const rootPackage = qa.readJson(paths.rootPackage);
const extensionPackage = qa.readJson(paths.extensionPackage);
const changelog = qa.read(paths.changelog);
const releaseProcess = qa.read(paths.releaseProcess);
const chromeStoreRelease = qa.read(paths.chromeStoreRelease);
const ruleDeliveryPlan = qa.read(paths.ruleDeliveryPlan);
const releaseDraft011 = qa.read(paths.releaseDraft011);
const readme = qa.read(paths.readme);

if (rootPackage.version !== extensionPackage.version) {
  qa.fail(`root package version (${rootPackage.version}) must match extension version (${extensionPackage.version})`);
}

for (const text of [changelog, releaseProcess, ruleDeliveryPlan]) {
  qa.assertIncludes(text, rootPackage.version, "release docs");
}

for (const command of [
  "pnpm package:extension",
  "pnpm qa:public-repo",
  "pnpm qa:public-docs",
  "pnpm qa:privacy-regression",
  "pnpm qa:webllm-model-policy",
  "pnpm qa:webllm-compatibility",
  "pnpm qa:rule-catalog",
  "pnpm qa:extension:e2e-harness",
  "pnpm qa:dependency-policy",
  "pnpm qa:demo:seo",
  "pnpm qa:rules:production",
  "pnpm qa:portfolio-case-study",
  "pnpm qa:extension:size",
  "pnpm qa:extension:manifest",
  "pnpm qa:chrome-store"
]) {
  qa.assertIncludes(releaseProcess, command, paths.releaseProcess);
}

for (const phrase of ["残Issueをすべて解消", "ZIPを先にアップロードしません", "GitHub Release", "Chrome Web Store"]) {
  qa.assertIncludes(releaseProcess, phrase, paths.releaseProcess);
}

qa.assertIncludes(changelog, "## Unreleased", paths.changelog);
qa.assertIncludes(changelog, "## 0.1.0 - 2026-06-20", paths.changelog);
qa.assertIncludes(chromeStoreRelease, "pnpm qa:extension:size", paths.chromeStoreRelease);
qa.assertIncludes(ruleDeliveryPlan, "残Issueをすべて解消", paths.ruleDeliveryPlan);
qa.assertIncludes(readme, "CHANGELOG.md", paths.readme);

for (const phrase of [
  "2026-06-27",
  "8.37 MB",
  "1111C923375284F978C01D1925D1BF857275EBB44F48EAFF9BCD9BC2A271471C",
  "Chrome Web Store Developer Dashboardへ手動アップロード"
]) {
  qa.assertIncludes(chromeStoreRelease, phrase, paths.chromeStoreRelease);
  qa.assertIncludes(releaseDraft011, phrase, paths.releaseDraft011);
}

console.log("release policy QA passed");
