import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = resolve(".");
const paths = {
  workflow: ".github/workflows/github-pages.yml",
  viteConfig: "apps/site/vite.config.ts",
  siteConfig: "apps/site/src/lib/siteConfig.ts",
  privacyPage: "apps/site/privacy/index.html",
  supportPage: "apps/site/support/index.html",
  notFoundPage: "apps/site/404.html",
  noJekyll: "apps/site/public/.nojekyll",
  signer: "scripts/sign-github-pages-rules.ts",
  rules: "rules/latest.json",
  releaseConfig: "apps/extension/config/rule-delivery.release.json",
  rootPackage: "package.json"
};

function fail(message) {
  throw new Error(`GitHub Pages readiness QA failed: ${message}`);
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

for (const removedPath of ["functions/api/rules/latest.ts", "apps/worker/wrangler.toml", "apps/worker/src/index.ts"]) {
  if (existsSync(resolve(rootDir, removedPath))) {
    fail(`${removedPath} must be removed after the GitHub Pages migration`);
  }
}

const workflow = read(paths.workflow);
for (const phrase of [
  "branches: [main]",
  "pages: write",
  "id-token: write",
  "environment:",
  "name: github-pages",
  "RULE_SIGNING_PRIVATE_JWK: ${{ secrets.RULE_SIGNING_PRIVATE_JWK }}",
  "pnpm build:pages",
  "actions/deploy-pages@v4"
]) {
  assertIncludes(workflow, phrase, paths.workflow);
}

if (workflow.includes("pull_request:")) {
  fail("the production signing workflow must not run on pull_request");
}

assertIncludes(read(paths.viteConfig), 'base: "/ai-mae-check/"', paths.viteConfig);
for (const phrase of ["SITE_BASE_PATH", "githubPagesConfig", "latest.json"]) {
  assertIncludes(read(paths.siteConfig), phrase, paths.siteConfig);
}

for (const [pagePath, expectedTitle] of [
  [paths.privacyPage, "プライバシーポリシー | AIまえチェック"],
  [paths.supportPage, "サポート | AIまえチェック"],
  [paths.notFoundPage, "ページが見つかりません | AIまえチェック"]
]) {
  assertIncludes(read(pagePath), expectedTitle, pagePath);
  if (read(pagePath).includes('type="module"')) {
    fail(`${pagePath} must remain readable without JavaScript`);
  }
}

const signer = read(paths.signer);
for (const phrase of [
  "RULE_KEY_ID",
  "RULE_SIGNING_PRIVATE_JWK",
  "signRemoteRuleBundle",
  "apps/site/dist/rules/latest.json",
  "apps/site/dist/api/rules/latest.json"
]) {
  assertIncludes(signer, phrase, paths.signer);
}
if (signer.includes("privateJwkText,")) {
  fail("the signing script must not log the private key");
}

const rules = JSON.parse(read(paths.rules));
if (rules.minExtensionVersion !== "0.1.2" || rules.deliveryStatus !== "active") {
  fail("rules/latest.json must target 0.1.2 and be active");
}

const releaseConfig = JSON.parse(read(paths.releaseConfig));
if (releaseConfig.endpoint !== "https://shunya-mabuchi.github.io/ai-mae-check/rules/latest.json") {
  fail("extension endpoint must point to GitHub Pages");
}
if (JSON.stringify(releaseConfig).includes('"d"')) {
  fail("release config must not contain a private JWK field");
}

const rootPackage = JSON.parse(read(paths.rootPackage));
if (rootPackage.scripts?.["build:pages"] !== "pnpm build:site && tsx scripts/sign-github-pages-rules.ts") {
  fail("build:pages script is not wired");
}

for (const builtPath of [
  "apps/site/dist/index.html",
  "apps/site/dist/privacy/index.html",
  "apps/site/dist/support/index.html",
  "apps/site/dist/404.html",
  "apps/site/dist/.nojekyll"
]) {
  if (!existsSync(resolve(rootDir, builtPath))) {
    fail(`${builtPath} is missing. Run pnpm build:site first.`);
  }
}

for (const [route, expectedUrl] of Object.entries({
  privacy: "https://shunya-mabuchi.github.io/ai-mae-check/privacy/",
  support: "https://shunya-mabuchi.github.io/ai-mae-check/support/"
})) {
  assertIncludes(
    read(`apps/site/dist/${route}/index.html`),
    `<link rel="canonical" href="${expectedUrl}" />`,
    `apps/site/dist/${route}/index.html`
  );
}

console.log("GitHub Pages readiness QA passed");
