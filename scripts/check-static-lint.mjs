import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = resolve(".");

const runtimeRoots = [
  "apps/site/src/",
  "apps/extension/entrypoints/",
  "apps/extension/src/",
  "packages/core/src/",
  "packages/llm/src/"
];

const codeRoots = [
  ...runtimeRoots,
  "apps/site/tests/",
  "apps/extension/e2e/",
  "apps/extension/tests/",
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
  },
  {
    pattern: /biome-ignore/u,
    detail: "biome-ignore で静的検査を迂回しないでください"
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
const biomeConfig = JSON.parse(read("biome.json"));
const expectedLintCommand =
  "biome ci . --diagnostic-level=error && node scripts/check-static-lint.mjs";

if (packageJson.scripts?.lint !== expectedLintCommand) {
  findings.push({
    file: "package.json",
    line: 0,
    detail: "pnpm lint はBiomeとリポジトリ固有QAを順番に実行してください",
    text: String(packageJson.scripts?.lint ?? "")
  });
}

for (const [scriptName, expectedCommand] of Object.entries({
  "lint:report": "biome lint .",
  format: "biome format --write .",
  "format:check": "biome format ."
})) {
  if (packageJson.scripts?.[scriptName] !== expectedCommand) {
    findings.push({
      file: "package.json",
      line: 0,
      detail: `${scriptName} はBiomeの標準コマンドを実行してください`,
      text: String(packageJson.scripts?.[scriptName] ?? "")
    });
  }
}

if (!/^\d+\.\d+\.\d+$/u.test(String(packageJson.devDependencies?.["@biomejs/biome"] ?? ""))) {
  findings.push({
    file: "package.json",
    line: 0,
    detail: "@biomejs/biome は再現可能な固定バージョンで管理してください",
    text: String(packageJson.devDependencies?.["@biomejs/biome"] ?? "")
  });
}

const biomeRules = biomeConfig.linter?.rules;
if (
  biomeRules?.suspicious?.noExplicitAny !== "error" ||
  biomeRules?.suspicious?.noTsIgnore !== "error"
) {
  findings.push({
    file: "biome.json",
    line: 0,
    detail: "Biomeで明示的なanyと@ts-ignoreをエラーにしてください",
    text: ""
  });
}

const runtimeOverride = biomeConfig.overrides?.find((override) =>
  override.includes?.includes("apps/extension/src/**")
);
if (runtimeOverride?.linter?.rules?.suspicious?.noConsole !== "error") {
  findings.push({
    file: "biome.json",
    line: 0,
    detail: "実行時コードではBiomeのnoConsoleをエラーにしてください",
    text: ""
  });
}

const biomeIncludes = biomeConfig.files?.includes ?? [];
for (const requiredIgnore of [
  "!!**/dist",
  "!!**/.output",
  "!!apps/site/public",
  "!!rules/latest.json"
]) {
  if (!biomeIncludes.includes(requiredIgnore)) {
    findings.push({
      file: "biome.json",
      line: 0,
      detail: `生成物・署名済み配信物の除外「${requiredIgnore}」を維持してください`,
      text: ""
    });
  }
}

if (biomeIncludes.some((pattern) => pattern.endsWith(".css"))) {
  findings.push({
    file: "biome.json",
    line: 0,
    detail: "Tailwind CSS 4固有構文を含むCSSは初期Biome対象から外してください",
    text: ""
  });
}

if (biomeConfig.assist?.enabled !== false) {
  findings.push({
    file: "biome.json",
    line: 0,
    detail: "大量のimport差分を避けるためBiome Assistは段階導入してください",
    text: ""
  });
}

for (const requiredFormatTarget of [
  "biome.json",
  "package.json",
  "packages/design-tokens/src/**"
]) {
  if (!biomeConfig.formatter?.includes?.includes(requiredFormatTarget)) {
    findings.push({
      file: "biome.json",
      line: 0,
      detail: `Biome formatterの段階導入対象「${requiredFormatTarget}」を維持してください`,
      text: ""
    });
  }
}

if (biomeConfig.formatter?.lineEnding !== "lf") {
  findings.push({
    file: "biome.json",
    line: 0,
    detail: "WindowsとCIで同じ合否になるようformatter.lineEndingはlfを維持してください",
    text: String(biomeConfig.formatter?.lineEnding ?? "")
  });
}

const gitAttributes = read(".gitattributes");
for (const requiredAttribute of [
  "biome.json text eol=lf",
  "package.json text eol=lf",
  "packages/design-tokens/src/** text eol=lf"
]) {
  if (!gitAttributes.includes(requiredAttribute)) {
    findings.push({
      file: ".gitattributes",
      line: 0,
      detail: `Biome formatter対象のLF固定「${requiredAttribute}」を維持してください`,
      text: ""
    });
  }
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
