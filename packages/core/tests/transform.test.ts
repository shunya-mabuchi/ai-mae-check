import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { detectSensitiveText, resolveTransformMode, TEXT_TRANSFORM_MODES, transformText } from "../src";

describe("transformText", () => {
  it("mask modeでは既存のplaceholderマスクを使う", () => {
    const input = "連絡先は taro@example.com です。";
    const detection = detectSensitiveText(input);
    const result = transformText(input, detection.findings, "mask");

    expect(result.mode).toBe("mask");
    expect(result.resolvedMode).toBe("placeholder");
    expect(result.requiresLlm).toBe(false);
    expect(result.transformedText).toBe("連絡先は [EMAIL_1] です。");
    expect(result.placeholderMap[0]?.originalText).toBe("taro@example.com");
  });

  it("placeholder modeはmask modeと同じplaceholder置換を使う", () => {
    const input = "mail taro@example.com phone 090-1234-5678";
    const detection = detectSensitiveText(input);
    const result = transformText(input, detection.findings, "placeholder");

    expect(TEXT_TRANSFORM_MODES).toEqual(["placeholder", "generalize", "redact"]);
    expect(resolveTransformMode("mask")).toBe("placeholder");
    expect(result.mode).toBe("placeholder");
    expect(result.resolvedMode).toBe("placeholder");
    expect(result.transformedText).toBe("mail [EMAIL_1] phone [PHONE_1]");
  });

  it("generalize modeではカテゴリ別の固定表現へ置換する", () => {
    const input = "taro@example.com から https://example.com/path に共有します。";
    const detection = detectSensitiveText(input);
    const result = transformText(input, detection.findings, "generalize");

    expect(result.mode).toBe("generalize");
    expect(result.resolvedMode).toBe("generalize");
    expect(result.requiresLlm).toBe(false);
    expect(result.transformedText).toBe("[メールアドレス] から [URL] に共有します。");
    expect(result.placeholderMap.map((entry) => entry.placeholder)).toEqual(["[メールアドレス]", "[URL]"]);
  });

  it("redact modeは値を再利用しにくい表現へ置換する", () => {
    const input = "mail taro@example.com phone 090-1234-5678";
    const detection = detectSensitiveText(input);
    const result = transformText(input, detection.findings, "redact");

    expect(result.mode).toBe("redact");
    expect(result.resolvedMode).toBe("redact");
    expect(result.transformedText).toBe("mail [削除済み] phone [削除済み]");
    expect(result.findings.map((finding) => finding.placeholder)).toEqual(["[削除済み]", "[削除済み]"]);
    expect(result.placeholderMap.map((entry) => entry.placeholder)).toEqual(["[削除済み]", "[削除済み]"]);
    expect(result.placeholderMap.map((entry) => entry.originalText)).toEqual(["taro@example.com", "090-1234-5678"]);
  });

  it("TransformModeにsafe_prompt前提のminimizeを含めない", () => {
    const typesSource = readFileSync(resolve(process.cwd(), "src/types.ts"), "utf8");
    const transformSource = readFileSync(resolve(process.cwd(), "src/transform.ts"), "utf8");

    expect(typesSource).not.toContain('"minimize"');
    expect(transformSource).not.toContain('mode === "minimize"');
  });
});
