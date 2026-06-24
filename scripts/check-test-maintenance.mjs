import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = resolve(".");

const trackedLargeTests = [
  {
    file: "apps/extension/tests/llmBridgePage.test.ts",
    maxLines: 450,
    splitBy: "bridge page lifecycle / request handling / error handling"
  },
  {
    file: "packages/llm/tests/llm.test.ts",
    maxLines: 440,
    splitBy: "parser / candidate conversion / analyzer fallback"
  },
  {
    file: "apps/extension/e2e/extension.spec.ts",
    maxLines: 390,
    splitBy: "paste scenarios / submit scenarios / keyboard scenarios"
  },
  {
    file: "packages/llm/tests/runtimeService.test.ts",
    maxLines: 330,
    splitBy: "prepare / analyze / error state"
  }
];

function read(relativePath) {
  return readFileSync(resolve(rootDir, relativePath), "utf8");
}

function lineCount(relativePath) {
  return read(relativePath).split(/\r?\n/u).length;
}

const findings = [];

for (const target of trackedLargeTests) {
  const lines = lineCount(target.file);
  if (lines > target.maxLines) {
    findings.push(
      `${target.file} is ${lines} lines; split by ${target.splitBy} before raising the ${target.maxLines} line budget`
    );
  }
}

const docs = read("docs/test-maintenance.md");
for (const target of trackedLargeTests) {
  if (!docs.includes(target.file) || !docs.includes(String(target.maxLines))) {
    findings.push(`docs/test-maintenance.md must mention ${target.file} and its ${target.maxLines} line budget`);
  }
}

if (!docs.includes("シナリオ単位に分割する") || !docs.includes("今すぐ物理分割しない")) {
  findings.push("docs/test-maintenance.md must explain the scenario-based split policy and current no-split decision");
}

const ci = read(".github/workflows/ci.yml");
if (!ci.includes("pnpm qa:test-maintenance")) {
  findings.push(".github/workflows/ci.yml must run pnpm qa:test-maintenance");
}

if (findings.length > 0) {
  console.error("Test maintenance QA failed:");
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exit(1);
}

console.log("test maintenance QA passed");
