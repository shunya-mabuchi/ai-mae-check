import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const manifestPath = resolve("apps/extension/.output/chrome-mv3/manifest.json");

const expectedTargetMatches = [
  "https://chatgpt.com/*",
  "https://chat.openai.com/*",
  "https://claude.ai/*",
  "https://gemini.google.com/*",
  "https://www.perplexity.ai/*",
  "https://perplexity.ai/*"
];

function fail(message) {
  throw new Error(`manifest QA failed: ${message}`);
}

function sameMembers(actual, expected) {
  return actual.length === expected.length && expected.every((item) => actual.includes(item));
}

function assertNoUnexpectedHosts(hosts) {
  if (hosts.includes("<all_urls>")) {
    fail("<all_urls> must not be requested");
  }

  if (hosts.some((host) => host.includes("localhost") || host.includes("127.0.0.1"))) {
    fail("localhost or 127.0.0.1 must remain test-only and must not be included in the release manifest");
  }
}

if (!existsSync(manifestPath)) {
  fail(`manifest not found at ${manifestPath}. Run pnpm build:extension first.`);
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

if (manifest.manifest_version !== 3) {
  fail("manifest_version must be 3");
}

if (manifest.name !== "AIまえチェック") {
  fail("manifest name must be AIまえチェック");
}

if (manifest.description !== "AIに送る前に、個人情報・秘密情報・APIキーの消し忘れをブラウザ内で確認します。") {
  fail("manifest description is not the public Japanese description");
}

const permissions = manifest.permissions ?? [];
if (!sameMembers(permissions, ["storage"])) {
  fail(`permissions must only contain storage. actual=${JSON.stringify(permissions)}`);
}

const hostPermissions = manifest.host_permissions ?? [];
assertNoUnexpectedHosts(hostPermissions);
if (!sameMembers(hostPermissions, expectedTargetMatches)) {
  fail(`host_permissions mismatch. actual=${JSON.stringify(hostPermissions)}`);
}

const contentScriptMatches = manifest.content_scripts?.flatMap((script) => script.matches ?? []) ?? [];
assertNoUnexpectedHosts(contentScriptMatches);
if (!sameMembers(contentScriptMatches, expectedTargetMatches)) {
  fail(`content script matches mismatch. actual=${JSON.stringify(contentScriptMatches)}`);
}

const webAccessibleResources = manifest.web_accessible_resources ?? [];
const bridgeResource = webAccessibleResources.find((entry) => {
  const resources = entry.resources ?? [];
  return resources.includes("llm-worker.js") && resources.includes("llm-bridge.html");
});

if (!bridgeResource) {
  fail("web_accessible_resources must expose llm-worker.js and llm-bridge.html for WebLLM bridge");
}

for (const iconResource of ["icon/16.png", "icon/32.png", "icon/48.png", "icon/128.png"]) {
  if (!bridgeResource.resources.includes(iconResource)) {
    fail(`web_accessible_resources must expose ${iconResource} for Content Script modal icons`);
  }
}

assertNoUnexpectedHosts(bridgeResource.matches ?? []);
if (!sameMembers(bridgeResource.matches ?? [], expectedTargetMatches)) {
  fail(`WebLLM bridge matches mismatch. actual=${JSON.stringify(bridgeResource.matches ?? [])}`);
}

for (const size of ["16", "32", "48", "128"]) {
  if (manifest.icons?.[size] !== `icon/${size}.png`) {
    fail(`icons.${size} must point to icon/${size}.png`);
  }

  if (manifest.action?.default_icon?.[size] !== `icon/${size}.png`) {
    fail(`action.default_icon.${size} must point to icon/${size}.png`);
  }
}

const csp = manifest.content_security_policy?.extension_pages ?? "";
for (const required of ["'wasm-unsafe-eval'", "worker-src 'self'", "https://huggingface.co"]) {
  if (!csp.includes(required)) {
    fail(`extension_pages CSP must include ${required}`);
  }
}

console.log("manifest QA passed");
