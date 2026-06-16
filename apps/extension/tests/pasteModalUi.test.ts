import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("paste review modal UI", () => {
  it("paste_guardモードでも、そのまま貼り付けと安全な依頼文生成を表示する", () => {
    const modalSource = readFileSync(resolve(process.cwd(), "src/lib/modal.ts"), "utf8");

    expect(modalSource).toContain("そのまま貼り付け");
    expect(modalSource).toContain("安全な依頼文に整える");
    expect(modalSource).toContain("safePromptButton");
  });

  it("paste_guardモードではそのまま貼り付けを見せたうえで必要時に無効化する", () => {
    const modalSource = readFileSync(resolve(process.cwd(), "src/lib/modal.ts"), "utf8");

    expect(modalSource).toContain("rawButton.toggleAttribute");
    expect(modalSource).toContain("高リスクまたはSecret Guard対象のため、そのまま貼り付けはできません。");
  });

  it("mediumリスクの貼り付けはpaste_guardではなく通常確認として扱う", () => {
    const contentSource = readFileSync(resolve(process.cwd(), "entrypoints/content.ts"), "utf8");

    expect(contentSource).toContain('mode: guard.action === "sanitize_required" ? "paste_guard" : "default"');
  });
});
