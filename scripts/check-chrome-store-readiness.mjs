import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = resolve(".");
const manifestPath = resolve(rootDir, "apps/extension/.output/chrome-mv3/manifest.json");
const outputDir = resolve(rootDir, "apps/extension/.output");
const listingPath = resolve(rootDir, "docs/chrome-web-store-listing.json");
const privacyPolicyPath = resolve(rootDir, "docs/privacy-policy.md");
const maxZipBytes = 2 * 1024 * 1024 * 1024;

const requiredAssets = [
  ["docs/assets/store/icon-128.png", 128, 128],
  ["docs/assets/store/screenshot-01-lp.png", 1280, 800],
  ["docs/assets/store/screenshot-02-demo.png", 1280, 800],
  ["docs/assets/store/screenshot-03-extension-modal.png", 1280, 800],
  ["docs/assets/store/screenshot-04-options.png", 1280, 800],
  ["docs/assets/store/promo-small-440x280.png", 440, 280],
  ["docs/assets/store/promo-marquee-1400x560.png", 1400, 560]
];

const forbiddenPhrases = ["完全に安全", "100%", "すべての情報漏洩を防ぎます"];

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

if (!existsSync(privacyPolicyPath)) {
  fail("docs/privacy-policy.md is missing");
}

const manifest = readJson(manifestPath);
const listingText = readFileSync(listingPath, "utf8");
const listing = JSON.parse(listingText);

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

if (listing.category !== "仕事効率化") {
  fail("category must be 仕事効率化");
}

if (listing.language !== "日本語") {
  fail("language must be 日本語");
}

if (!listing.supportUrl.includes("github.com/shunya-mabuchi/ai-mae-check/issues")) {
  fail("supportUrl must point to GitHub Issues");
}

if (!listing.privacyPolicyUrl.includes("privacy")) {
  fail("privacyPolicyUrl must point to the privacy policy");
}

if (!listing.singlePurpose.includes("AIに文章を送る前")) {
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

if (!listing.remoteCode?.explanation?.includes("任意コード")) {
  fail("remote code explanation must mention that arbitrary code is not fetched");
}

if (listing.dataUsage?.collectsUserData !== false) {
  fail("dataUsage.collectsUserData must be false");
}

if (!listing.dataUsage?.explanation?.includes("本文")) {
  fail("data usage explanation must state how pasted/sent text is handled");
}

if (!Array.isArray(listing.testInstructions) || listing.testInstructions.length !== 6) {
  fail("testInstructions must contain 6 reviewer steps");
}

for (const [relativePath, width, height] of requiredAssets) {
  assertPngDimensions(relativePath, width, height);
}

console.log("Chrome Web Store readiness QA passed");
