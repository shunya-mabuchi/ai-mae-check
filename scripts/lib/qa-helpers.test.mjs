import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createQaContext } from "./qa-helpers.mjs";

describe("qa-helpers", () => {
  it("テキストとJSONをrootDir基準で読み込める", () => {
    const dir = mkdtempSync(join(tmpdir(), "ai-mae-check-qa-"));

    try {
      mkdirSync(join(dir, "docs"));
      writeFileSync(join(dir, "docs", "sample.txt"), "AIまえチェック", "utf8");
      writeFileSync(join(dir, "docs", "sample.json"), '{"name":"AIまえチェック"}', "utf8");

      const qa = createQaContext({ rootDir: dir, errorPrefix: "test QA failed" });

      expect(qa.read("docs/sample.txt")).toBe("AIまえチェック");
      expect(qa.readJson("docs/sample.json")).toEqual({ name: "AIまえチェック" });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("assertion失敗時にQA名と文脈を含む日本語向けエラーを返す", () => {
    const qa = createQaContext({ rootDir: ".", errorPrefix: "公開文書QA failed" });

    expect(() => qa.assertIncludes("abc", "def", "README")).toThrow(
      "公開文書QA failed: README must include: def"
    );
    expect(() => qa.assertNotIncludes("abc", "abc", "README")).toThrow(
      "公開文書QA failed: README must not include overclaim: abc"
    );
  });

  it("行数を数え、行数予算超過の説明を組み立てられる", () => {
    const dir = mkdtempSync(join(tmpdir(), "ai-mae-check-qa-"));

    try {
      mkdirSync(join(dir, "scripts"));
      writeFileSync(join(dir, "scripts", "sample.mjs"), "line1\nline2\nline3", "utf8");

      const qa = createQaContext({ rootDir: dir, errorPrefix: "保守QA failed" });

      expect(qa.fileExists("scripts/sample.mjs")).toBe(true);
      expect(qa.fileExists("scripts/missing.mjs")).toBe(false);
      expect(qa.lineCount("scripts/sample.mjs")).toBe(3);
      expect(
        qa.createLineBudgetFinding({
          file: "scripts/sample.mjs",
          maxLines: 2,
          splitBy: "reader / checker",
          message: ({ file, lines, maxLines, splitBy }) =>
            `${file} は ${lines} 行です。${splitBy} で分割してから ${maxLines} 行の予算を見直してください`
        })
      ).toBe("scripts/sample.mjs は 3 行です。reader / checker で分割してから 2 行の予算を見直してください");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
