import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const textExtensions = new Set([
  ".cjs",
  ".css",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".toml",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml"
]);

const textFileNames = new Set([".dev.vars.example", ".gitignore"]);

const forbiddenTrackedPathPatterns = [
  /(^|\/)\.output(\/|$)/u,
  /(^|\/)artifacts(\/|$)/u,
  /(^|\/)coverage(\/|$)/u,
  /(^|\/)dist(\/|$)/u,
  /(^|\/)playwright-report(\/|$)/u,
  /(^|\/)test-results(\/|$)/u,
  /\.log$/u,
  /\.private(?:\.|-)?jwk\.json$/u,
  /\.zip$/u
];

const allowedDummyValues = new Set(["AKIAIOSFODNN7EXAMPLE", "ghp_dummyDummyDummyDummyDummyDummy123456"]);

const tokenPatterns = [
  {
    name: "AWS access key",
    pattern: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/gu
  },
  {
    name: "GitHub token",
    pattern: /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/gu
  },
  {
    name: "GitHub fine-grained token",
    pattern: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/gu
  },
  {
    name: "OpenAI style key",
    pattern: /\bsk-[A-Za-z0-9_-]{20,}\b/gu
  },
  {
    name: "Slack token",
    pattern: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/gu
  }
];

function trackedFiles() {
  return execFileSync("git", ["ls-files"], { encoding: "utf8" })
    .split(/\r?\n/u)
    .map((file) => file.trim())
    .filter(Boolean);
}

function isTextFile(file) {
  return textFileNames.has(path.basename(file)) || textExtensions.has(path.extname(file));
}

function addFinding(findings, file, line, kind, detail) {
  findings.push({ file, line, kind, detail });
}

function scanLine(findings, file, lineNumber, line) {
  const privateJwkMatch = line.match(/"d"\s*:\s*"([^"]+)"/u);
  if (privateJwkMatch && privateJwkMatch[1] !== "REPLACE_WITH_PRIVATE_D") {
    addFinding(findings, file, lineNumber, "private JWK d field", "privateJwkの秘密値らしきフィールドがあります");
  }

  if (/BEGIN (?:RSA |OPENSSH |EC |DSA |)?PRIVATE KEY/u.test(line)) {
    const allowedFixture = file === "packages/core/tests/detect.test.ts";
    if (!allowedFixture) {
      addFinding(findings, file, lineNumber, "private key PEM", "秘密鍵PEMらしき文字列があります");
    }
  }

  for (const { name, pattern } of tokenPatterns) {
    pattern.lastIndex = 0;
    for (const match of line.matchAll(pattern)) {
      const value = match[0];
      if (!allowedDummyValues.has(value)) {
        addFinding(findings, file, lineNumber, name, "実値らしきトークン形式の文字列があります");
      }
    }
  }
}

const findings = [];
const files = trackedFiles();

for (const file of files) {
  const normalized = file.replace(/\\/gu, "/");
  if (forbiddenTrackedPathPatterns.some((pattern) => pattern.test(normalized))) {
    addFinding(findings, file, 0, "tracked generated artifact", "生成物・ログ・秘密鍵ファイル候補がGit追跡対象です");
    continue;
  }

  if (!isTextFile(file)) {
    continue;
  }

  const lines = readFileSync(file, "utf8").split(/\r?\n/u);
  lines.forEach((line, index) => scanLine(findings, file, index + 1, line));
}

if (findings.length > 0) {
  console.error("Public repo safety QA failed:");
  for (const finding of findings) {
    console.error(`- ${finding.file}${finding.line > 0 ? `:${finding.line}` : ""} ${finding.kind}: ${finding.detail}`);
  }
  process.exit(1);
}

console.log("Public repo safety QA passed");
