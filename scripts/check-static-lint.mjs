import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = resolve(".");

const runtimeRoots = [
  "apps/demo/src/",
  "apps/extension/entrypoints/",
  "apps/extension/src/",
  "apps/worker/src/",
  "functions/",
  "packages/core/src/",
  "packages/llm/src/"
];

const codeRoots = [
  ...runtimeRoots,
  "apps/demo/tests/",
  "apps/extension/e2e/",
  "apps/extension/tests/",
  "apps/worker/tests/",
  "packages/core/tests/",
  "packages/llm/tests/",
  "scripts/"
];

const sourceFilePattern = /\.(?:ts|tsx|js|mjs)$/u;
const textFilePattern = /\.(?:md|ts|tsx|js|mjs|json|yml|yaml|txt)$/u;
const skippedFiles = new Set(["scripts/check-static-lint.mjs"]);

const typeSafetyPatterns = [
  {
    pattern: /:\s*any(?:[\s,;)=\]}>]|$)/u,
    detail: "明示的な any 型は使わないでください"
  },
  {
    pattern: /\bas\s+any\b/u,
    detail: "as any で型検査を迂回しないでください"
  },
  {
    pattern: /<\s*any\s*>/u,
    detail: "ジェネリックに any を渡さないでください"
  },
  {
    pattern: /\b(?:Array|Promise|Set|Map)\s*<[^>]*\bany\b[^>]*>/u,
    detail: "標準ジェネリックに any を混ぜないでください"
  },
  {
    pattern: /\bRecord\s*<[^>]*\bany\b[^>]*>/u,
    detail: "Record に any を混ぜないでください"
  },
  {
    pattern: /@ts-ignore/u,
    detail: "@ts-ignore で型エラーを隠さないでください"
  },
  {
    pattern: /@ts-expect-error/u,
    detail: "@ts-expect-error は理由付きの最小範囲に限定してください"
  },
  {
    pattern: /eslint-disable/u,
    detail: "eslint-disable は導入前でも静的検査の迂回として扱います"
  }
];

const runtimeConsolePattern = /\bconsole\.(?:log|debug|info|warn|error)\s*\(/u;
const mojibakePattern =
  /[\u7e3a\u7e5d\u7e67\u8b41\u8b5b\u83f4\u9015\u873f\u8709\u87c6\u90a8\u87b3\u8737\u9058\u86df\u9aef\u9711\u8822\u8373\u9005\u96ce\u8b20\ufffd\uf8f0]/u;

function trackedFiles() {
  return execFileSync("git", ["ls-files"], { encoding: "utf8" })
    .split(/\r?\n/u)
    .map((file) => file.trim().replace(/\\/gu, "/"))
    .filter(Boolean);
}

function isUnderAnyRoot(file, roots) {
  return roots.some((root) => file.startsWith(root));
}

function read(relativePath) {
  return readFileSync(resolve(rootDir, relativePath), "utf8");
}

function scanLines(file, checks) {
  const lines = read(file).split(/\r?\n/u);
  return lines.flatMap((line, index) =>
    checks
      .filter(({ pattern }) => pattern.test(line))
      .map(({ detail }) => ({ file, line: index + 1, detail, text: line.trim() }))
  );
}

const findings = [];

for (const file of trackedFiles()) {
  if (skippedFiles.has(file) || !existsSync(resolve(rootDir, file))) {
    continue;
  }

  if (textFilePattern.test(file)) {
    findings.push(
      ...scanLines(file, [
        {
          pattern: mojibakePattern,
          detail: "文字化けの可能性がある文字列を修正してください"
        }
      ])
    );
  }

  if (sourceFilePattern.test(file) && isUnderAnyRoot(file, codeRoots)) {
    findings.push(...scanLines(file, typeSafetyPatterns));
  }

  if (sourceFilePattern.test(file) && isUnderAnyRoot(file, runtimeRoots)) {
    findings.push(
      ...scanLines(file, [
        {
          pattern: runtimeConsolePattern,
          detail: "アプリ本体・拡張本体・パッケージ本体でconsole出力を使わないでください"
        }
      ])
    );
  }
}

const packageJson = JSON.parse(read("package.json"));
if (packageJson.scripts?.lint !== "node scripts/check-static-lint.mjs") {
  findings.push({
    file: "package.json",
    line: 0,
    detail: "pnpm lint は静的lintスクリプトを直接実行してください",
    text: String(packageJson.scripts?.lint ?? "")
  });
}

const ci = read(".github/workflows/ci.yml");
if (!ci.includes("pnpm lint")) {
  findings.push({
    file: ".github/workflows/ci.yml",
    line: 0,
    detail: "CIで pnpm lint を実行してください",
    text: ""
  });
}

if (findings.length > 0) {
  console.error("Static lint QA failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}${finding.line > 0 ? `:${finding.line}` : ""} ${finding.detail}${
        finding.text ? `: ${finding.text}` : ""
      }`
    );
  }
  process.exit(1);
}

console.log("static lint QA passed");
