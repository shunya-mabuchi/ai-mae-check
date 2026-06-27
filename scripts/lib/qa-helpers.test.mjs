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
});
