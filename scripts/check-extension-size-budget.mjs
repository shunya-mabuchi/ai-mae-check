import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";

const rootDir = resolve(".");
const outputDir = resolve(rootDir, "apps/extension/.output");
const extensionDir = resolve(outputDir, "chrome-mv3");
const extensionPackage = JSON.parse(readFileSync(resolve(rootDir, "apps/extension/package.json"), "utf8"));
const releaseZipName = `ai-mae-checkextension-${extensionPackage.version}-chrome.zip`;
const releaseZipPath = resolve(outputDir, releaseZipName);

const budgets = {
  zipBytes: 20 * 1024 * 1024,
  unpackedBytes: 35 * 1024 * 1024,
  javascriptBytes: 8 * 1024 * 1024,
  contentScriptBytes: 300 * 1024,
  cssBytes: 150 * 1024
};

function fail(message) {
  throw new Error(`extension size budget QA failed: ${message}`);
}

function walkFiles(dir) {
  const files = [];

  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const stat = statSync(path);

    if (stat.isDirectory()) {
      files.push(...walkFiles(path));
    } else {
      files.push({ path, size: stat.size });
    }
  }

  return files;
}

function formatBytes(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

if (!existsSync(outputDir)) {
  fail(`output directory is missing: ${relative(rootDir, outputDir)}. Run pnpm package:extension first.`);
}

if (!existsSync(extensionDir)) {
  fail(`built extension directory is missing: ${relative(rootDir, extensionDir)}. Run pnpm package:extension first.`);
}

if (!existsSync(releaseZipPath)) {
  fail(`current release ZIP is missing: ${releaseZipName}. Run pnpm package:extension first.`);
}

const releaseZipBytes = statSync(releaseZipPath).size;
if (releaseZipBytes > budgets.zipBytes) {
  fail(`${relative(rootDir, releaseZipPath)} is ${formatBytes(releaseZipBytes)} and exceeds ZIP budget ${formatBytes(budgets.zipBytes)}`);
}

const files = walkFiles(extensionDir);
const unpackedBytes = files.reduce((total, file) => total + file.size, 0);

if (unpackedBytes > budgets.unpackedBytes) {
  fail(`unpacked extension is ${formatBytes(unpackedBytes)} and exceeds budget ${formatBytes(budgets.unpackedBytes)}`);
}

for (const file of files) {
  const relativePath = relative(rootDir, file.path).replaceAll("\\", "/");

  if (extname(file.path) === ".js" && file.size > budgets.javascriptBytes) {
    fail(`${relativePath} is ${formatBytes(file.size)} and exceeds JS budget ${formatBytes(budgets.javascriptBytes)}`);
  }

  if (relativePath.endsWith("content-scripts/content.js") && file.size > budgets.contentScriptBytes) {
    fail(`${relativePath} is ${formatBytes(file.size)} and exceeds content script budget ${formatBytes(budgets.contentScriptBytes)}`);
  }

  if (extname(file.path) === ".css" && file.size > budgets.cssBytes) {
    fail(`${relativePath} is ${formatBytes(file.size)} and exceeds CSS budget ${formatBytes(budgets.cssBytes)}`);
  }
}

const largestFiles = files
  .toSorted((a, b) => b.size - a.size)
  .slice(0, 8)
  .map((file) => `${relative(rootDir, file.path).replaceAll("\\", "/")}=${formatBytes(file.size)}`);

console.log(`extension size budget QA passed. zip=${formatBytes(releaseZipBytes)} unpacked=${formatBytes(unpackedBytes)} largest=[${largestFiles.join(", ")}]`);
