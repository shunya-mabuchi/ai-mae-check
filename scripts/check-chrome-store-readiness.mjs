import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { assertRuleDeliveryReleaseConfig, loadRuleDeliveryReleaseConfig } from "./lib/rule-delivery-release-config.mjs";

const rootDir = resolve(".");
const manifestPath = resolve(rootDir, "apps/extension/.output/chrome-mv3/manifest.json");
const contentScriptPath = resolve(rootDir, "apps/extension/.output/chrome-mv3/content-scripts/content.js");
const outputDir = resolve(rootDir, "apps/extension/.output");
const listingPath = resolve(rootDir, "docs/chrome-web-store-listing.json");
const assetManifestPath = resolve(rootDir, "docs/chrome-web-store-assets.json");
const submissionCopyPath = resolve(rootDir, "docs/chrome-web-store-submission-copy.md");
const privacyPolicyPath = resolve(rootDir, "docs/privacy-policy.md");
const maxZipBytes = 2 * 1024 * 1024 * 1024;

const forbiddenPhrases = ["絶対安全", "100%", "すべての情報漏洩を防ぎます", "完全に通信しません"];

function fail(message) {
  throw new Error(`Chrome Web Store readiness QA failed: ${message}`);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function assertText(value, fieldName) {
  if (typeof value !== "string" || value.trim().length === 0) {
    fail(`${fieldName} must be a non-empty string`);
  }
}

function assertPngDimensions(relativePath, expectedWidth, expectedHeight) {
  const path = resolve(rootDir, relativePath);
  if (!existsSync(path)) {
    fail(`${relativePath} is missing`);
  }

  const buffer = readFileSync(path);
  const signature = buffer.subarray(0, 8).toString("hex");
  if (signature !== "89504e470d0a1a0a") {
    fail(`${relativePath} must be a PNG file`);
  }

  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  if (width !== expectedWidth || height !== expectedHeight) {
    fail(`${relativePath} must be ${expectedWidth}x${expectedHeight}. actual=${width}x${height}`);
  }
}

function assertPngFile(relativePath, context) {
  const path = resolve(rootDir, relativePath);
  if (!existsSync(path)) {
    fail(`${context} is missing at ${relativePath}`);
  }

  const buffer = readFileSync(path);
  const signature = buffer.subarray(0, 8).toString("hex");
  if (signature !== "89504e470d0a1a0a") {
    fail(`${context} must be a PNG file`);
  }
}

function assertAsset(asset, context) {
  assertText(asset?.path, `${context}.path`);

  if (!Number.isInteger(asset.width) || !Number.isInteger(asset.height)) {
    fail(`${context}.width and ${context}.height must be integers`);
  }

  assertPngDimensions(asset.path, asset.width, asset.height);
}

if (!existsSync(manifestPath)) {
  fail(`manifest not found at ${manifestPath}. Run pnpm build:extension first.`);
}

if (!existsSync(outputDir)) {
  fail(`extension output directory not found at ${outputDir}. Run pnpm package:extension first.`);
}

const zipFiles = readdirSync(outputDir).filter((file) => file.endsWith(".zip"));
if (zipFiles.length === 0) {
  fail("Chrome Web Store submission ZIP is missing. Run pnpm package:extension first.");
}

for (const zipFile of zipFiles) {
  const zipPath = resolve(outputDir, zipFile);
  const { size } = statSync(zipPath);
  if (size <= 0) {
    fail(`${zipFile} is empty`);
  }

  if (size > maxZipBytes) {
    fail(`${zipFile} exceeds Chrome Web Store package size limit`);
  }
}

if (!existsSync(listingPath)) {
  fail("docs/chrome-web-store-listing.json is missing");
}

if (!existsSync(assetManifestPath)) {
  fail("docs/chrome-web-store-assets.json is missing");
}

if (!existsSync(submissionCopyPath)) {
  fail("docs/chrome-web-store-submission-copy.md is missing");
}

if (!existsSync(privacyPolicyPath)) {
  fail("docs/privacy-policy.md is missing");
}

if (!existsSync(contentScriptPath)) {
  fail(`built content script not found at ${contentScriptPath}. Run pnpm package:extension first.`);
}

const manifest = readJson(manifestPath);
const assetManifest = readJson(assetManifestPath);
const listingText = readFileSync(listingPath, "utf8");
const submissionCopyText = readFileSync(submissionCopyPath, "utf8");
const listing = JSON.parse(listingText);
const releaseConfig = assertRuleDeliveryReleaseConfig(loadRuleDeliveryReleaseConfig());

for (const phrase of forbiddenPhrases) {
  if (listingText.includes(phrase)) {
    fail(`store listing must not include overclaim phrase: ${phrase}`);
  }
}

if (manifest.manifest_version !== 3) {
  fail("manifest_version must be 3");
}

if (manifest.name !== "AIまえチェック") {
  fail("manifest name must be AIまえチェック");
}

if (listing.name !== manifest.name) {
  fail("store listing name must match manifest name");
}

assertText(listing.shortDescription, "shortDescription");
if (listing.shortDescription.length > 132) {
  fail("shortDescription must be 132 characters or fewer");
}

for (const field of ["detailedDescription", "category", "language", "supportUrl", "privacyPolicyUrl", "singlePurpose"]) {
  assertText(listing[field], field);
}

if (listing.category !== "ツール") {
  fail("category must be ツール");
}

if (listing.language !== "日本語") {
  fail("language must be 日本語");
}

if (listing.supportUrl !== "https://ai-mae-check.pages.dev/support") {
  fail("supportUrl must point to the Cloudflare Pages support page");
}

if (listing.privacyPolicyUrl !== "https://ai-mae-check.pages.dev/privacy") {
  fail("privacyPolicyUrl must point to the Cloudflare Pages privacy policy");
}

if (!listing.singlePurpose.includes("AIまえチェック")) {
  fail("singlePurpose must describe the send-before safety layer");
}

if (!listing.permissionJustifications?.storage?.includes("設定")) {
  fail("storage permission justification must explain settings storage");
}

if (!listing.permissionJustifications?.host_permissions?.includes("ChatGPT")) {
  fail("host permission justification must mention target AI services");
}

if (listing.remoteCode?.usesRemoteCode !== false) {
  fail("remoteCode.usesRemoteCode must be false");
}

if (!listing.remoteCode?.explanation?.includes("任意のコード")) {
  fail("remote code explanation must mention that arbitrary code is not fetched");
}

if (listing.dataUsage?.collectsUserData !== true) {
  fail("dataUsage.collectsUserData must be true because Chrome Web Store disclosure treats inspected page text as handled user data");
}

if (!Array.isArray(listing.dataUsage?.collectedDataTypes) || !listing.dataUsage.collectedDataTypes.includes("ウェブサイトのコンテンツ")) {
  fail("dataUsage.collectedDataTypes must include ウェブサイトのコンテンツ");
}

if (!Array.isArray(listing.dataUsage?.notCollectedDataTypes) || !listing.dataUsage.notCollectedDataTypes.includes("ウェブ履歴")) {
  fail("dataUsage.notCollectedDataTypes must include ウェブ履歴");
}

if (!listing.dataUsage?.explanation?.includes("販売・第三者提供")) {
  fail("data usage explanation must state how pasted/sent text is handled");
}

if (!Array.isArray(listing.testInstructions) || listing.testInstructions.length !== 6) {
  fail("testInstructions must contain 6 reviewer steps");
}

for (const requiredPhrase of [
  "GET /api/rules/latest",
  "リクエスト本文は使用しません",
  "外部LLM API",
  "chrome.storage.local"
]) {
  if (!listingText.includes(requiredPhrase) && !submissionCopyText.includes(requiredPhrase)) {
    fail(`public docs must include: ${requiredPhrase}`);
  }
}

for (const requiredCopy of [
  "# Chrome Web Store 掲載文 最終版",
  listing.name,
  listing.shortDescription,
  listing.supportUrl,
  listing.privacyPolicyUrl,
  listing.permissionJustifications.storage,
  listing.permissionJustifications.host_permissions,
  listing.remoteCode.explanation,
  listing.dataUsage.explanation
]) {
  if (!submissionCopyText.includes(requiredCopy)) {
    fail(`submission copy must include: ${requiredCopy}`);
  }
}

assertAsset(assetManifest.storeIcon, "storeIcon");
if (assetManifest.storeIcon.width !== 128 || assetManifest.storeIcon.height !== 128) {
  fail("storeIcon must be 128x128");
}

if (!Array.isArray(assetManifest.screenshots)) {
  fail("screenshots must be an array");
}

if (assetManifest.screenshots.length < 1 || assetManifest.screenshots.length > 5) {
  fail("screenshots must contain 1 to 5 images");
}

const screenshotOrders = assetManifest.screenshots.map((screenshot) => screenshot.order);
const expectedOrders = assetManifest.screenshots.map((_, index) => index + 1);
if (JSON.stringify(screenshotOrders) !== JSON.stringify(expectedOrders)) {
  fail(`screenshot orders must be sequential from 1. actual=${JSON.stringify(screenshotOrders)}`);
}

for (const [index, screenshot] of assetManifest.screenshots.entries()) {
  assertAsset(screenshot, `screenshots[${index}]`);
  assertText(screenshot.title, `screenshots[${index}].title`);
  assertText(screenshot.purpose, `screenshots[${index}].purpose`);

  if (screenshot.width !== 1280 || screenshot.height !== 800) {
    fail(`screenshots[${index}] must be 1280x800`);
  }

  if (screenshot.sourceKind === "real_extension_capture") {
    assertText(screenshot.sourceImage, `screenshots[${index}].sourceImage`);
    assertPngFile(screenshot.sourceImage, `screenshots[${index}].sourceImage`);
  }
}

if (assetManifest.screenshots.some((screenshot) => screenshot.primarySurface !== "extension")) {
  fail("store screenshots must show the Chrome extension itself");
}

if (assetManifest.screenshots.some((screenshot) => screenshot.sourceKind !== "real_extension_capture")) {
  fail("store screenshots must be based on real extension captures");
}

if (!Array.isArray(assetManifest.promotionalImages)) {
  fail("promotionalImages must be an array");
}

for (const promo of assetManifest.promotionalImages) {
  assertAsset(promo, `promotionalImages.${promo?.type ?? "unknown"}`);
}

const smallPromo = assetManifest.promotionalImages.find((promo) => promo.type === "small");
if (!smallPromo || smallPromo.width !== 440 || smallPromo.height !== 280) {
  fail("small promotional image must be 440x280");
}

const marqueePromo = assetManifest.promotionalImages.find((promo) => promo.type === "marquee");
if (!marqueePromo || marqueePromo.width !== 1400 || marqueePromo.height !== 560) {
  fail("marquee promotional image must be 1400x560");
}

const builtContentScript = readFileSync(contentScriptPath, "utf8");
for (const requiredValue of [releaseConfig.endpoint, releaseConfig.keyId, releaseConfig.publicJwk.x, releaseConfig.publicJwk.y]) {
  if (!builtContentScript.includes(requiredValue)) {
    fail(`built extension must include release rule config value: ${requiredValue}`);
  }
}

console.log("Chrome Web Store readiness QA passed");
