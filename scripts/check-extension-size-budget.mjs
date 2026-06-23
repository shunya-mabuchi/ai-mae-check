import { existsSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";

const rootDir = resolve(".");
const outputDir = resolve(rootDir, "apps/extension/.output");
const extensionDir = resolve(outputDir, "chrome-mv3");

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

const zipFiles = readdirSync(outputDir)
  .filter((file) => file.endsWith(".zip"))
  .map((file) => ({ path: join(outputDir, file), size: statSync(join(outputDir, file)).size }));

if (zipFiles.length === 0) {
  fail("Chrome Web Store ZIP is missing. Run pnpm package:extension first.");
}

for (const zip of zipFiles) {
  if (zip.size > budgets.zipBytes) {
    fail(`${relative(rootDir, zip.path)} is ${formatBytes(zip.size)} and exceeds ZIP budget ${formatBytes(budgets.zipBytes)}`);
  }
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

console.log(`extension size budget QA passed. zip=${formatBytes(Math.max(...zipFiles.map((file) => file.size)))} unpacked=${formatBytes(unpackedBytes)} largest=[${largestFiles.join(", ")}]`);
