import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createPasteReviewActionState, createSafePromptReviewState } from "../src/lib/modal";

describe("paste review modal UI", () => {
  it("paste_guardモードでも主要アクションをフッターに表示する", () => {
    const modalSource = readFileSync(resolve(process.cwd(), "src/lib/modal.ts"), "utf8");

    expect(modalSource).toContain(
      "footer.append(footerNote, maskButton, llmButton, safePromptButton, applySafePromptButton, rawButton, cancelButton)"
    );
    expect(modalSource).toContain("安全な依頼文に整える");
    expect(modalSource).toContain("そのまま貼り付け");
  });

  it("安全化必須のときも、そのまま貼り付けを不可状態として見せる", () => {
    const state = createPasteReviewActionState(false);

    expect(state.rawButtonText).toBe("そのまま貼り付け（不可）");
    expect(state.rawButtonDisabled).toBe(true);
    expect(state.footerNote).toBe("高リスクまたはSecret Guard対象のため、そのまま貼り付けはできません。");
  });

  it("そのまま貼り付け可能なときは通常ラベルで表示する", () => {
    const state = createPasteReviewActionState(true);

    expect(state.rawButtonText).toBe("そのまま貼り付け");
    expect(state.rawButtonDisabled).toBe(false);
    expect(state.footerNote).toBe("");
  });

  it("disabled状態のprimaryボタンにhoverしても白いボタンに変わらない", () => {
    const modalSource = readFileSync(resolve(process.cwd(), "src/lib/modal.ts"), "utf8");

    expect(modalSource).toContain(".hm-primary:disabled:hover");
    expect(modalSource).toContain("background: #2f7d57");
  });

  it("安全な依頼文は生成後すぐ挿入せず、プレビューしてから選択する", () => {
    const modalSource = readFileSync(resolve(process.cwd(), "src/lib/modal.ts"), "utf8");

    expect(modalSource).not.toContain('resolve({ type: "insert", text: result.safePrompt })');
    expect(modalSource).toContain("safePromptPreview");
    expect(modalSource).toContain("applySafePromptButton");
    expect(modalSource).toContain("applySafePromptButton.hidden = safePromptState.previewHidden");
  });

  it("安全な依頼文がない間は入力ボタンを選べない", () => {
    const state = createSafePromptReviewState("");

    expect(state.applyButtonText).toBe("安全な依頼文を入力");
    expect(state.applyButtonDisabled).toBe(true);
    expect(state.previewHidden).toBe(true);
  });

  it("安全な依頼文が生成されたら入力ボタンを選べる", () => {
    const state = createSafePromptReviewState("顧客名を伏せた依頼文です。");

    expect(state.applyButtonText).toBe("安全な依頼文を入力");
    expect(state.applyButtonDisabled).toBe(false);
    expect(state.previewHidden).toBe(false);
  });

  it("mediumリスクの貼り付けはpaste_guardではなく通常確認として扱う", () => {
    const contentSource = readFileSync(resolve(process.cwd(), "entrypoints/content.ts"), "utf8");

    expect(contentSource).toContain('mode: guard.action === "sanitize_required" ? "paste_guard" : "default"');
  });
});
