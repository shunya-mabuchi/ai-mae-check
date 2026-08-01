import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = resolve(".");
const paths = {
  workflow: ".github/workflows/github-pages.yml",
  viteConfig: "apps/demo/vite.config.ts",
  siteRoutes: "apps/demo/src/lib/siteRoutes.ts",
  routeBuilder: "scripts/prepare-github-pages-artifact.mjs",
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
  assertIncludes(read(paths.siteRoutes), phrase, paths.siteRoutes);
}

for (const route of ["privacy", "support", "404.html", ".nojekyll"]) {
  assertIncludes(read(paths.routeBuilder), route, paths.routeBuilder);
}

const signer = read(paths.signer);
for (const phrase of [
  "RULE_KEY_ID",
  "RULE_SIGNING_PRIVATE_JWK",
  "signRemoteRuleBundle",
  "apps/demo/dist/rules/latest.json",
  "apps/demo/dist/api/rules/latest.json"
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
if (rootPackage.scripts?.["build:pages"] !== "pnpm build:demo && tsx scripts/sign-github-pages-rules.ts") {
  fail("build:pages script is not wired");
}

for (const builtPath of [
  "apps/demo/dist/index.html",
  "apps/demo/dist/privacy/index.html",
  "apps/demo/dist/support/index.html",
  "apps/demo/dist/404.html",
  "apps/demo/dist/.nojekyll"
]) {
  if (!existsSync(resolve(rootDir, builtPath))) {
    fail(`${builtPath} is missing. Run pnpm build:demo first.`);
  }
}

for (const [route, expectedUrl] of Object.entries({
  privacy: "https://shunya-mabuchi.github.io/ai-mae-check/privacy/",
  support: "https://shunya-mabuchi.github.io/ai-mae-check/support/"
})) {
  assertIncludes(
    read(`apps/demo/dist/${route}/index.html`),
    `<link rel="canonical" href="${expectedUrl}" />`,
    `apps/demo/dist/${route}/index.html`
  );
}

console.log("GitHub Pages readiness QA passed");
