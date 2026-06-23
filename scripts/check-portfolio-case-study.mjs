import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = resolve(".");

const paths = {
  caseStudy: "docs/portfolio-case-study.md",
  readme: "README.md",
  footer: "apps/demo/src/components/Footer.tsx"
};

function fail(message) {
  throw new Error(`portfolio case study QA failed: ${message}`);
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

const caseStudy = read(paths.caseStudy);
const readme = read(paths.readme);
const footer = read(paths.footer);

for (const phrase of [
  "Chrome拡張が本体",
  "ルールベース検出",
  "WebLLM",
  "署名付きルール配信",
  "chrome.storage.local",
  "外部LLM API",
  "Cloudflare Pages Functions",
  "情報漏洩を完全に防ぐものではありません",
  "ポートフォリオとして見てほしい点",
  "mermaid"
]) {
  assertIncludes(caseStudy, phrase, paths.caseStudy);
}

for (const phrase of ["docs/portfolio-case-study.md", "ケーススタディ"]) {
  assertIncludes(readme, phrase, paths.readme);
}

assertIncludes(footer, "portfolio-case-study.md", paths.footer);

console.log("portfolio case study QA passed");
