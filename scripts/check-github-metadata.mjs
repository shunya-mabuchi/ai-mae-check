import { execFileSync } from "node:child_process";

const repo = process.env.GITHUB_REPOSITORY || "shunya-mabuchi/ai-mae-check";

const titlePrefixPattern = /^(docs|feat|fix|chore|refactor|brand|demo|extension|llm|core|qa|release|backend|rename|content|ui|test|tests):\s/iu;
const englishHeadingPattern = /^##\s*(Summary|Validation|Tests|Changes|Overview|Background|Issue|Issues|Notes|Screenshots|Manual|Checklist)\b/imu;
const englishTemplatePattern =
  /\b(Closes #\d+\.\s+(Adds|Replaces|Updates|Marks|Creates)|Verified with|Adds |Replaces |Updates |Fixes |This PR|Manual confirmation|Screenshot check)\b/iu;
const mojibakeCodePoints = [
  0x7e3a, 0x7e5d, 0x7e67, 0x8b41, 0x8b5b, 0x83f4, 0x9015, 0x873f, 0x8709, 0x87c6, 0x90a8, 0x87b3, 0x8737, 0x9058, 0x86df,
  0x9aef, 0x9711, 0x8822, 0x8373, 0x9005, 0x96ce, 0x8b20, 0xfffd, 0xf8f0
];
const mojibakePattern = new RegExp(`[${mojibakeCodePoints.map((codePoint) => `\\u{${codePoint.toString(16)}}`).join("")}]`, "u");
const unsafeMarkerPatterns = [mojibakePattern, /\[codex\]/iu, /\^G/u, /\?\?\?\?/u];

function readGithubItems(kind) {
  try {
    const output = execFileSync(
      "gh",
      [kind, "list", "--repo", repo, "--state", "all", "--limit", "500", "--json", "number,title,body,state,url"],
      { encoding: "utf8" }
    );
    return JSON.parse(output).map((item) => ({ ...item, kind }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`GitHub CLIで${kind === "issue" ? "Issue" : "PR"}を取得できませんでした。gh auth status とネットワーク接続を確認してください。詳細: ${message}`);
  }
}

function collectFindings(item) {
  const findings = [];
  const body = item.body ?? "";

  if (titlePrefixPattern.test(item.title)) {
    findings.push("タイトルに英語prefixが残っています");
  }
  if (unsafeMarkerPatterns.some((pattern) => pattern.test(item.title) || pattern.test(body))) {
    findings.push("文字化け、内部表記、または制御文字らしき文字列が残っています");
  }
  if (englishHeadingPattern.test(body)) {
    findings.push("本文に英語テンプレート見出しが残っています");
  }
  if (englishTemplatePattern.test(body)) {
    findings.push("本文に英語テンプレート文が残っています");
  }

  return findings;
}

const items = [...readGithubItems("issue"), ...readGithubItems("pr")];
const findings = [];

for (const item of items) {
  const itemFindings = collectFindings(item);
  for (const finding of itemFindings) {
    findings.push(`${item.kind === "issue" ? "Issue" : "PR"} #${item.number}: ${finding} - ${item.title}`);
  }
}

if (findings.length > 0) {
  console.error("GitHubメタデータQA failed:");
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exit(1);
}

console.log("GitHub metadata QA passed");
