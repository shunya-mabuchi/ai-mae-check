import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = resolve(".");

const paths = {
  listing: "docs/chrome-web-store-listing.json",
  submissionCopy: "docs/chrome-web-store-submission-copy.md",
  releaseMemo: "docs/chrome-web-store-release.md",
  privacyPolicy: "docs/privacy-policy.md",
  readme: "README.md",
  hero: "apps/demo/src/components/Hero.tsx",
  launchFlow: "apps/demo/src/lib/productLaunchFlow.ts",
  siteRoutes: "apps/demo/src/lib/siteRoutes.ts",
  privacyPage: "apps/demo/src/components/PrivacyPolicyPage.tsx",
  supportPage: "apps/demo/src/components/SupportPage.tsx",
  fileInspectionRoadmap: "docs/file-inspection-roadmap.md",
  extensionSiteQa: "docs/extension-site-qa.md",
  siteAdapterContract: "docs/site-adapter-contract.md",
  scriptMaintenance: "docs/script-maintenance.md"
};

const internalPolicyPaths = {
  agents: "AGENTS.md"
};

const forbiddenOverclaims = ["絶対安全", "100%検出", "すべての情報漏洩を防ぎます", "完全に通信しません"];
const supportedSites = ["ChatGPT", "Claude", "Gemini", "Perplexity"];
const forbiddenStalePhrases = [
  "Perplexityは後続adapter",
  "初期対象はChatGPT、Claude、Geminiです",
  "0.1.1の最終ZIP再生成",
  "GitHub Release v0.1.0公開"
];
const privacyClaims = [
  "永続保存",
  "外部LLM API",
  "chrome.storage.local",
  "モデルファイル",
  "情報漏洩を完全に防ぐものではありません"
];
const ocrDecisionClaims = ["画像OCR", "現時点では実装しない判断", "安全判定済みとは扱いません"];
const fileInspectionCandidateClaims = [
  "候補ライブラリ",
  "pdfjs-dist",
  "mammoth",
  "xlsx",
  "tesseract.js",
  "@tesseract.js-data/jpn",
  "Web Worker",
  "5秒以上",
  "進捗表示",
  "キャンセル"
];
const perplexityDecisionClaims = [
  "Perplexity",
  "0.1.xで有効",
  "paste確認",
  "送信前確認",
  "安全化後の入力反映",
  "0.2系では添付経路",
  "<all_urls>"
];
const scriptMaintenanceClaims = ["QA/生成スクリプト", "pnpm qa:script-maintenance", "ユーザー本文"];

function read(relativePath) {
  return readFileSync(resolve(rootDir, relativePath), "utf8");
}

function fail(message) {
  throw new Error(`Public docs sync QA failed: ${message}`);
}

function assertIncludes(text, needle, context) {
  if (!text.includes(needle)) {
    fail(`${context} must include: ${needle}`);
  }
}

function assertNotIncludes(text, needle, context) {
  if (text.includes(needle)) {
    fail(`${context} must not include overclaim: ${needle}`);
  }
}

const listing = JSON.parse(read(paths.listing));
const docs = Object.fromEntries(Object.entries(paths).map(([key, path]) => [key, read(path)]));
const internalPolicyDocs = Object.fromEntries(Object.entries(internalPolicyPaths).map(([key, path]) => [key, read(path)]));

for (const field of ["name", "homepageUrl", "supportUrl", "privacyPolicyUrl", "shortDescription", "detailedDescription"]) {
  if (typeof listing[field] !== "string" || listing[field].trim().length === 0) {
    fail(`listing.${field} must be a non-empty string`);
  }
}

for (const [key, text] of Object.entries(docs)) {
  for (const phrase of forbiddenOverclaims) {
    assertNotIncludes(text, phrase, key);
  }
}

for (const [key, text] of Object.entries({ ...docs, ...internalPolicyDocs })) {
  for (const phrase of forbiddenStalePhrases) {
    assertNotIncludes(text, phrase, key);
  }
}

for (const requiredDoc of ["submissionCopy", "releaseMemo", "readme"]) {
  assertIncludes(docs[requiredDoc], listing.name, requiredDoc);
  assertIncludes(docs[requiredDoc], listing.supportUrl, requiredDoc);
  assertIncludes(docs[requiredDoc], listing.privacyPolicyUrl, requiredDoc);
}

assertIncludes(docs.readme, "Chrome Web Store", "README");
assertIncludes(docs.readme, listing.homepageUrl, "README");
assertIncludes(docs.launchFlow, "https://chrome.google.com/webstore/detail/idedmkfplfieijdcflcogkngplhkkecc", "productLaunchFlow");
assertIncludes(docs.launchFlow, "Chrome Web Store公開中", "productLaunchFlow");
assertIncludes(docs.hero, "Chrome拡張が本体", "Hero");
assertIncludes(docs.hero, "Chrome Web Store公開中", "Hero");

for (const [route, url] of Object.entries({
  home: listing.homepageUrl,
  privacy: listing.privacyPolicyUrl,
  support: listing.supportUrl
})) {
  assertIncludes(docs.siteRoutes, url, `siteRoutes.${route}`);
}

for (const site of supportedSites) {
  for (const requiredDoc of ["listing", "submissionCopy", "releaseMemo", "readme", "launchFlow"]) {
    assertIncludes(docs[requiredDoc], site, requiredDoc);
  }
}

for (const claim of privacyClaims) {
  for (const requiredDoc of ["listing", "submissionCopy", "privacyPolicy", "privacyPage", "readme"]) {
    assertIncludes(docs[requiredDoc], claim, requiredDoc);
  }
}

for (const requiredDoc of ["privacyPolicy", "supportPage", "readme"]) {
  assertIncludes(docs[requiredDoc], "実APIキー", requiredDoc);
  assertIncludes(docs[requiredDoc], "実トークン", requiredDoc);
}

for (const claim of ocrDecisionClaims) {
  for (const requiredDoc of ["privacyPolicy", "privacyPage", "supportPage", "fileInspectionRoadmap", "readme"]) {
    assertIncludes(docs[requiredDoc], claim, requiredDoc);
  }
}

for (const claim of fileInspectionCandidateClaims) {
  assertIncludes(docs.fileInspectionRoadmap, claim, "fileInspectionRoadmap");
}

for (const claim of perplexityDecisionClaims) {
  for (const requiredDoc of ["extensionSiteQa", "siteAdapterContract"]) {
    assertIncludes(docs[requiredDoc], claim, requiredDoc);
  }
}

for (const claim of scriptMaintenanceClaims) {
  assertIncludes(docs.scriptMaintenance, claim, "scriptMaintenance");
}

if (listing.dataUsage?.collectsUserData !== true) {
  fail("Chrome Web Store dataUsage.collectsUserData must remain true for inspected website content disclosure");
}

assertIncludes(listing.dataUsage?.explanation ?? "", "開発者のサーバーへ送信・収集せず", "listing.dataUsage.explanation");
assertIncludes(listing.remoteCode?.explanation ?? "", "任意のコードを取得して実行しません", "listing.remoteCode.explanation");

console.log("Public docs sync QA passed");
