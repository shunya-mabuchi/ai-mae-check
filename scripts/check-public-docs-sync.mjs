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
  supportPage: "apps/demo/src/components/SupportPage.tsx"
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

for (const [key, text] of Object.entries(docs)) {
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

if (listing.dataUsage?.collectsUserData !== true) {
  fail("Chrome Web Store dataUsage.collectsUserData must remain true for inspected website content disclosure");
}

assertIncludes(listing.dataUsage?.explanation ?? "", "開発者のサーバーへ送信・収集せず", "listing.dataUsage.explanation");
assertIncludes(listing.remoteCode?.explanation ?? "", "任意のコードを取得して実行しません", "listing.remoteCode.explanation");

console.log("Public docs sync QA passed");
