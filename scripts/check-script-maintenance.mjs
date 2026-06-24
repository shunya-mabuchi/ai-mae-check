import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = resolve(".");

const trackedScripts = [
  {
    file: "scripts/generate-brand-assets.mjs",
    maxLines: 380,
    splitBy: "canvas drawing / image sizing / file output"
  },
  {
    file: "scripts/check-chrome-store-readiness.mjs",
    maxLines: 340,
    splitBy: "manifest checks / asset checks / store copy checks"
  },
  {
    file: "scripts/check-github-metadata.mjs",
    maxLines: 180,
    splitBy: "GitHub fetch / pattern checks / report output"
  }
];

function read(relativePath) {
  return readFileSync(resolve(rootDir, relativePath), "utf8");
}

function lineCount(relativePath) {
  return read(relativePath).split(/\r?\n/u).length;
}

const findings = [];

if (!existsSync(resolve(rootDir, "docs/script-maintenance.md"))) {
  findings.push("docs/script-maintenance.md がありません");
}

const docs = read("docs/script-maintenance.md");

for (const target of trackedScripts) {
  if (!existsSync(resolve(rootDir, target.file))) {
    findings.push(`${target.file} がありません`);
    continue;
  }

  const lines = lineCount(target.file);
  if (lines > target.maxLines) {
    findings.push(`${target.file} は ${lines} 行です。${target.splitBy} の単位で分割してから ${target.maxLines} 行の予算を見直してください`);
  }

  if (!docs.includes(target.file) || !docs.includes(String(target.maxLines)) || !docs.includes(target.splitBy)) {
    findings.push(`docs/script-maintenance.md に ${target.file} / ${target.maxLines} 行 / ${target.splitBy} の説明が必要です`);
  }
}

for (const phrase of ["ユーザー本文", "実APIキー", "実トークン", "pnpm qa:script-maintenance", "上限を上げる前に責務分割を検討"]) {
  if (!docs.includes(phrase)) {
    findings.push(`docs/script-maintenance.md に「${phrase}」を含めてください`);
  }
}

if (findings.length > 0) {
  console.error("Script maintenance QA failed:");
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exit(1);
}

console.log("script maintenance QA passed");
