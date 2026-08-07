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
  ruleDeliveryPlan: "docs/release-0.1.2-github-pages-plan.md",
  releaseDraft011: "docs/releases/v0.1.1.md",
  releaseDraft012: "docs/releases/v0.1.2.md",
  releaseDraft020: "docs/releases/v0.2.0.md",
  chromeStoreListing: "docs/chrome-web-store-listing.json",
  chromeStoreAssets: "docs/chrome-web-store-assets.json",
  chromeStoreSubmission: "docs/chrome-web-store-submission-copy.md",
  publishedState: "docs/chrome-web-store-published.json",
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
const releaseDraft012 = qa.read(paths.releaseDraft012);
const releaseDraft020 = qa.read(paths.releaseDraft020);
const chromeStoreListing = qa.readJson(paths.chromeStoreListing);
const chromeStoreAssets = qa.readJson(paths.chromeStoreAssets);
const chromeStoreSubmission = qa.read(paths.chromeStoreSubmission);
const publishedState = qa.readJson(paths.publishedState);
const readme = qa.read(paths.readme);

if (rootPackage.version !== extensionPackage.version) {
  qa.fail(`root package version (${rootPackage.version}) must match extension version (${extensionPackage.version})`);
}

for (const text of [changelog, releaseProcess, chromeStoreRelease, releaseDraft020, chromeStoreSubmission, readme]) {
  qa.assertIncludes(text, rootPackage.version, "release docs");
}

if (chromeStoreListing.releaseVersion !== rootPackage.version) {
  qa.fail(`store listing releaseVersion (${chromeStoreListing.releaseVersion}) must match root version (${rootPackage.version})`);
}

if (chromeStoreAssets.releaseVersion !== rootPackage.version) {
  qa.fail(`store assets releaseVersion (${chromeStoreAssets.releaseVersion}) must match root version (${rootPackage.version})`);
}

const currentVersionIsPublished = publishedState.version === rootPackage.version;

for (const command of [
  "pnpm package:extension",
  "pnpm qa:public-repo",
  "pnpm qa:public-docs",
  "pnpm qa:privacy-regression",
  "pnpm qa:local-ai-model-policy",
  "pnpm qa:local-ai-compatibility",
  "pnpm qa:rule-catalog",
  "pnpm qa:extension:e2e-harness",
  "pnpm qa:dependency-policy",
  "pnpm qa:tailwind4",
  "pnpm qa:site:publication",
  "pnpm qa:github-pages",
  "pnpm qa:rules:production",
  "pnpm qa:portfolio-case-study",
  "pnpm qa:extension:size",
  "pnpm qa:extension:manifest",
  "pnpm qa:chrome-store"
]) {
  qa.assertIncludes(releaseProcess, command, paths.releaseProcess);
}

for (const phrase of ["公開を確認", "GitHub Release", "Chrome Web Store"]) {
  qa.assertIncludes(releaseProcess, phrase, paths.releaseProcess);
}

qa.assertIncludes(changelog, "## Unreleased", paths.changelog);
qa.assertIncludes(changelog, "0.1.2", paths.changelog);
qa.assertIncludes(changelog, "## 0.1.1 - 2026-07-03", paths.changelog);
qa.assertIncludes(changelog, "## 0.1.0 - 2026-06-20", paths.changelog);
qa.assertIncludes(chromeStoreRelease, "pnpm qa:extension:size", paths.chromeStoreRelease);
qa.assertIncludes(ruleDeliveryPlan, "公開を確認", paths.ruleDeliveryPlan);
qa.assertIncludes(readme, "CHANGELOG.md", paths.readme);
qa.assertIncludes(releaseDraft012, "GitHub Pages", paths.releaseDraft012);
qa.assertIncludes(releaseDraft012, "0.1.2", paths.releaseDraft012);
qa.assertIncludes(releaseDraft020, "ai-mae-checkextension-0.2.0-chrome.zip", paths.releaseDraft020);
qa.assertIncludes(ruleDeliveryPlan, "0.1.2", paths.ruleDeliveryPlan);

if (currentVersionIsPublished) {
  qa.assertIncludes(
    changelog,
    `## ${rootPackage.version} - ${publishedState.checkedAt}`,
    paths.changelog
  );
  qa.assertIncludes(releaseDraft020, "一般公開を確認", paths.releaseDraft020);
  qa.assertIncludes(chromeStoreSubmission, `${rootPackage.version}公開版`, paths.chromeStoreSubmission);
  qa.assertIncludes(readme, `公開版は \`${rootPackage.version}\``, paths.readme);
} else {
  qa.assertIncludes(changelog, `## ${rootPackage.version} - 提出候補`, paths.changelog);
  qa.assertIncludes(releaseDraft020, "提出候補", paths.releaseDraft020);
  qa.assertIncludes(chromeStoreSubmission, "現在の一般公開版", paths.chromeStoreSubmission);
}

for (const phrase of [
  "2026-06-27",
  "2026-07-03",
  "8.37 MB",
  "6F74A9C2312413F15B58D66D9B95796BF654368AE8A53FF5D17B4D1A7790B42F",
  "Chrome Web Storeで0.1.1公開を確認"
]) {
  qa.assertIncludes(chromeStoreRelease, phrase, paths.chromeStoreRelease);
  qa.assertIncludes(releaseDraft011, phrase, paths.releaseDraft011);
}

console.log("release policy QA passed");
