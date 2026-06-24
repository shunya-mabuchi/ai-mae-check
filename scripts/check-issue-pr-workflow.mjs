import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = resolve(".");
const paths = [
  ".github/ISSUE_TEMPLATE/bug_report.md",
  ".github/ISSUE_TEMPLATE/task.md",
  ".github/ISSUE_TEMPLATE/docs.md",
  ".github/ISSUE_TEMPLATE/config.yml",
  ".github/pull_request_template.md",
  "docs/issue-pr-workflow.md",
  "scripts/check-github-metadata.mjs",
  "SECURITY.md"
];

function fail(message) {
  throw new Error(`Issue/PR workflow QA failed: ${message}`);
}

function read(relativePath) {
  return readFileSync(resolve(rootDir, relativePath), "utf8");
}

function assertIncludes(text, needle, context) {
  if (!text.includes(needle)) {
    fail(`${context} must include: ${needle}`);
  }
}

for (const path of paths) {
  if (!existsSync(resolve(rootDir, path))) {
    fail(`${path} is missing`);
  }
}

const bugReport = read(".github/ISSUE_TEMPLATE/bug_report.md");
const task = read(".github/ISSUE_TEMPLATE/task.md");
const docs = read(".github/ISSUE_TEMPLATE/docs.md");
const config = read(".github/ISSUE_TEMPLATE/config.yml");
const pr = read(".github/pull_request_template.md");
const workflow = read("docs/issue-pr-workflow.md");

for (const [context, text] of [
  ["bug report template", bugReport],
  ["task template", task],
  ["PR template", pr],
  ["workflow docs", workflow]
]) {
  assertIncludes(text, "実APIキー", context);
  assertIncludes(text, "実トークン", context);
}

for (const label of ["type:bug", "type:task", "type:docs"]) {
  assertIncludes(`${bugReport}\n${task}\n${docs}\n${workflow}`, label, "Issue labels");
}

for (const label of ["area:extension", "area:release", "priority:high", "status:blocked"]) {
  assertIncludes(workflow, label, "workflow labels");
}

for (const milestone of ["0.1.1", "0.2.0", "post-0.2"]) {
  assertIncludes(workflow, milestone, "workflow milestones");
}

assertIncludes(config, "SECURITY.md", "Issue template config");
assertIncludes(pr, "Closes #", "PR template");
assertIncludes(pr, "pnpm test", "PR template");
assertIncludes(workflow, "pnpm qa:github-metadata", "workflow metadata QA");
assertIncludes(workflow, "gh auth status", "workflow metadata QA");

console.log("Issue/PR workflow QA passed");
