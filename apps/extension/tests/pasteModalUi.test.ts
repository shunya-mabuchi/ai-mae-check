import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { pasteReviewModeForAction } from "../src/content/contentReview";
import {
  createPasteReviewActionState,
  shouldDisablePasteReviewMaskAction
} from "../src/lib/pasteReviewState";

describe("paste review modal UI", () => {
  it("paste_guardモードでも安全な依頼文生成を表示しない", () => {
    const modalSource = readFileSync(resolve(process.cwd(), "src/lib/modal.ts"), "utf8");

    expect(modalSource).toContain("footer.append(footerNote, maskButton, llmButton, rawButton, cancelButton)");
    expect(modalSource).not.toContain("安全な依頼文に整える");
    expect(modalSource).not.toContain("安全な依頼文を入力");
    expect(modalSource).not.toContain("analyzeSanitizeWithBridge");
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
    const stylesPath = resolve(process.cwd(), "src/lib/modalStyles.ts");
    const modalSource = readFileSync(resolve(process.cwd(), "src/lib/modal.ts"), "utf8");

    expect(existsSync(stylesPath)).toBe(true);
    expect(modalSource).toContain('import { pasteReviewModalCss } from "./modalStyles"');
    expect(modalSource).toContain("style.textContent = pasteReviewModalCss");
    expect(modalSource).not.toContain("const css = `");

    const stylesSource = readFileSync(stylesPath, "utf8");
    expect(stylesSource).toContain(".hm-primary:disabled:hover");
    expect(stylesSource).toContain("background: #2f7d57");
  });

  it("mediumリスクの貼り付けはpaste_guardではなく通常確認として扱う", () => {
    expect(pasteReviewModeForAction("confirm")).toBe("default");
    expect(pasteReviewModeForAction("sanitize_required")).toBe("paste_guard");
  });

  it("AI文脈チェック確認だけマスク対象が0件なら実行ボタンを無効にする", () => {
    expect(shouldDisablePasteReviewMaskAction("default", 0)).toBe(false);
    expect(shouldDisablePasteReviewMaskAction("paste_guard", 0)).toBe(false);
    expect(shouldDisablePasteReviewMaskAction("context_check", 0)).toBe(true);
    expect(shouldDisablePasteReviewMaskAction("context_check", 1)).toBe(false);
  });
});
