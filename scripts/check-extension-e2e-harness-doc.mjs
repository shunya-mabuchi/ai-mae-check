import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = resolve(".");

const paths = {
  harness: "docs/extension-e2e-harness.md",
  siteQa: "docs/extension-site-qa.md",
  readme: "README.md",
  releaseProcess: "docs/release-process.md",
  chromeStoreRelease: "docs/chrome-web-store-release.md",
  manifestQa: "scripts/check-extension-manifest.mjs",
  playwrightConfig: "apps/extension/playwright.extension.config.ts",
  mockComposer: "apps/extension/e2e/mock-composer.html",
  extensionSpec: "apps/extension/e2e/extension.spec.ts",
  extensionE2eWorkflow: ".github/workflows/extension-e2e.yml",
  buildScript: "scripts/build-extension-e2e.mjs",
  runScript: "scripts/run-extension-e2e.mjs",
  wxtConfig: "apps/extension/wxt.config.ts",
  packageJson: "package.json"
};

function fail(message) {
  throw new Error(`Extension E2E harness QA failed: ${message}`);
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

const harness = read(paths.harness);
const siteQa = read(paths.siteQa);
const readme = read(paths.readme);
const releaseProcess = read(paths.releaseProcess);
const chromeStoreRelease = read(paths.chromeStoreRelease);
const manifestQa = read(paths.manifestQa);
const packageJson = JSON.parse(read(paths.packageJson));

for (const phrase of [
  "最小ハーネスは実装済み",
  "実サイトのログイン状態に依存しない",
  "ユーザー本文",
  "実APIキー",
  "実トークン",
  "ローカルの模擬composerページ",
  "paste検知",
  "送信前確認",
  "安全化して貼り付け",
  "安全化して送信",
  "high / critical / 秘密情報保護対象",
  "textarea",
  "contenteditable",
  "ChatGPT / Claude / Gemini / Perplexity",
  "実サイト手動QA",
  "WebLLM実モデルロード",
  "CIには載せない",
  "workflow_dispatch",
  "xvfb-run",
  "手動CI",
  "2026-06-24時点の判断",
  "PR/push時の自動CIへ昇格します",
  "継続監視条件",
  "E2E専用build",
  "EXTENSION_E2E=1",
  "localhost",
  "<all_urls>",
  "Chrome Web Store提出用ZIPはE2E専用buildから作らない",
  "pnpm test:extension:e2e"
]) {
  assertIncludes(harness, phrase, paths.harness);
}

for (const phrase of [
  "2回成功・1回失敗",
  "chrome://extensions/?options=",
  "テスト用ページを作成してから余分な `chrome://extensions` ページだけを閉じる",
  "Chromeプロファイルの `lockfile` 解放",
  "貼り付け確認のキャンセル時に入力欄へ反映しない",
  "mediumリスクだけの場合、詳細確認後にそのまま送信できる",
  "highリスクの場合、そのまま送信へ切り替えられない"
]) {
  assertIncludes(harness, phrase, paths.harness);
}

for (const phrase of [
  "#431反映後の `main` で `extension-e2e.yml` を3回手動実行し、3回とも成功しました",
  "28086696311",
  "28086714135",
  "28086731353",
  "pull_request",
  "push",
  "PR/push時CIへ昇格します"
]) {
  assertIncludes(harness, phrase, paths.harness);
}

for (const phrase of ["extension-e2e-harness.md", "拡張E2Eハーネス"]) {
  assertIncludes(readme, phrase, paths.readme);
  assertIncludes(releaseProcess, phrase, paths.releaseProcess);
  assertIncludes(chromeStoreRelease, phrase, paths.chromeStoreRelease);
}

for (const phrase of [
  "実サイトQA",
  "実サイトQA記録テンプレート",
  "本文・検出文字列・placeholderMap・現在のページURLを含めず",
  "adapter-editor",
  "adapter-submit",
  "現在のページURL全文や会話ID"
]) {
  assertIncludes(siteQa, phrase, paths.siteQa);
}
assertIncludes(manifestQa, "<all_urls>", paths.manifestQa);
assertIncludes(manifestQa, "localhost", paths.manifestQa);

if (packageJson.scripts["build:extension:e2e"] !== "node scripts/build-extension-e2e.mjs") {
  fail("build:extension:e2e script must run scripts/build-extension-e2e.mjs");
}

if (packageJson.scripts["test:extension:e2e"] !== "node scripts/run-extension-e2e.mjs") {
  fail("test:extension:e2e script must run scripts/run-extension-e2e.mjs");
}

assertIncludes(read(paths.wxtConfig), "EXTENSION_E2E", paths.wxtConfig);
assertIncludes(read(paths.wxtConfig), ".output-e2e", paths.wxtConfig);
assertIncludes(read(paths.playwrightConfig), "mock-composer.html", paths.playwrightConfig);
assertIncludes(read(paths.extensionSpec), "安全化して入力", paths.extensionSpec);
assertIncludes(read(paths.extensionSpec), "安全化して送信", paths.extensionSpec);
assertIncludes(read(paths.extensionSpec), "contenteditable", paths.extensionSpec);
assertIncludes(read(paths.extensionSpec), "貼り付け確認をキャンセルすると入力欄へ反映しない", paths.extensionSpec);
assertIncludes(read(paths.extensionSpec), "mediumリスクだけなら詳細確認後にそのまま送信できる", paths.extensionSpec);
assertIncludes(read(paths.extensionSpec), "highリスクはそのまま送信へ切り替えられない", paths.extensionSpec);
assertIncludes(read(paths.extensionE2eWorkflow), "workflow_dispatch", paths.extensionE2eWorkflow);
assertIncludes(read(paths.extensionE2eWorkflow), "pull_request", paths.extensionE2eWorkflow);
assertIncludes(read(paths.extensionE2eWorkflow), "branches: [main]", paths.extensionE2eWorkflow);
assertIncludes(read(paths.extensionE2eWorkflow), "xvfb-run --auto-servernum pnpm test:extension:e2e", paths.extensionE2eWorkflow);

console.log("Extension E2E harness QA passed");
