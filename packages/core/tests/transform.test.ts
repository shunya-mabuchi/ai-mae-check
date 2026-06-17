import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { detectSensitiveText, transformText } from "../src";

describe("transformText", () => {
  it("mask modeでは既存のplaceholderマスクを使う", () => {
    const input = "連絡先は taro@example.com です。";
    const detection = detectSensitiveText(input);
    const result = transformText(input, detection.findings, "mask");

    expect(result.mode).toBe("mask");
    expect(result.requiresLlm).toBe(false);
    expect(result.transformedText).toBe("連絡先は [EMAIL_1] です。");
    expect(result.placeholderMap[0]?.originalText).toBe("taro@example.com");
  });

  it("generalize modeではカテゴリ別の固定表現へ置換する", () => {
    const input = "taro@example.com から https://example.com/path に共有します。";
    const detection = detectSensitiveText(input);
    const result = transformText(input, detection.findings, "generalize");

    expect(result.mode).toBe("generalize");
    expect(result.requiresLlm).toBe(false);
    expect(result.transformedText).toBe("[メールアドレス] から [URL] に共有します。");
    expect(result.placeholderMap.map((entry) => entry.placeholder)).toEqual(["[メールアドレス]", "[URL]"]);
  });

  it("TransformModeにsafe_prompt前提のminimizeを含めない", () => {
    const typesSource = readFileSync(resolve(process.cwd(), "src/types.ts"), "utf8");
    const transformSource = readFileSync(resolve(process.cwd(), "src/transform.ts"), "utf8");

    expect(typesSource).not.toContain('"minimize"');
    expect(transformSource).not.toContain('mode === "minimize"');
  });
});
