import { describe, expect, it } from "vitest";
import type { LlmErrorDetail } from "@ai-mae-check/llm";
import {
  createPasteReviewLlmCompleteMessage,
  formatPasteReviewLlmStatusMessage,
  PASTE_REVIEW_LLM_DISABLED_MESSAGE,
  PASTE_REVIEW_LLM_INITIAL_MESSAGE,
  PASTE_REVIEW_LLM_LOADING_MESSAGE,
  shouldAutoRunPasteReviewLlm
} from "../src/lib/pasteReviewLlmState";

describe("pasteReviewLlmState", () => {
  it("初期・無効・ロード中の文言を返す", () => {
    expect(PASTE_REVIEW_LLM_INITIAL_MESSAGE).toBe("AI文脈チェックは手動で実行できます。");
    expect(PASTE_REVIEW_LLM_DISABLED_MESSAGE).toBe("設定でAI文脈チェックが無効になっています。");
    expect(PASTE_REVIEW_LLM_LOADING_MESSAGE).toBe("ローカルAIモデルを準備しています。初回のみ時間がかかる場合があります。");
  });

  it("候補数に応じて完了文言を返す", () => {
    expect(createPasteReviewLlmCompleteMessage(2)).toBe("AI文脈チェックで注意候補が見つかりました。");
    expect(createPasteReviewLlmCompleteMessage(0)).toBe(
      "AI文脈チェックでは追加の注意候補は見つかりませんでした。ただし、安全を保証するものではありません。"
    );
  });

  it("出力形式を読み取れなかった非致命メッセージを候補なし文言で上書きしない", () => {
    expect(
      createPasteReviewLlmCompleteMessage(
        0,
        "AI文脈チェックの出力形式は読み取れませんでした。ルールベース検出結果は維持されています。必要なら再実行してください。"
      )
    ).toBe(
      "AI文脈チェックの出力形式は読み取れませんでした。ルールベース検出結果は維持されています。必要なら再実行してください。"
    );
  });

  it("診断メモと技術詳細を追加してエラー文言を整形する", () => {
    const detail: LlmErrorDetail = {
      kind: "worker",
      message: "AI文脈チェックを実行できませんでした。",
      hint: "ページを再読み込みしてから再試行してください。",
      technicalDetail: "Worker disposed"
    };

    expect(formatPasteReviewLlmStatusMessage(detail.message, detail)).toBe(
      "AI文脈チェックを実行できませんでした。\n診断メモ: ページを再読み込みしてから再試行してください。\n詳細: Worker disposed"
    );
  });

  it("エラー詳細がない場合は元メッセージだけを返す", () => {
    expect(formatPasteReviewLlmStatusMessage("文脈リスクを確認しています。")).toBe("文脈リスクを確認しています。");
  });

  it("通常モードだけAI文脈チェックの自動実行を許可する", () => {
    const autoLlm = {
      enabled: true,
      modelId: "Llama-3.2-1B-Instruct-q4f32_1-MLC",
      mode: "auto" as const
    };

    expect(shouldAutoRunPasteReviewLlm("default", autoLlm)).toBe(true);
    expect(shouldAutoRunPasteReviewLlm("paste_guard", autoLlm)).toBe(false);
    expect(shouldAutoRunPasteReviewLlm("context_check", autoLlm)).toBe(false);
  });

  it("AI文脈チェックが無効または手動モードなら自動実行しない", () => {
    expect(
      shouldAutoRunPasteReviewLlm("default", {
        enabled: false,
        modelId: "Llama-3.2-1B-Instruct-q4f32_1-MLC",
        mode: "auto"
      })
    ).toBe(false);
    expect(
      shouldAutoRunPasteReviewLlm("default", {
        enabled: true,
        modelId: "Llama-3.2-1B-Instruct-q4f32_1-MLC",
        mode: "manual"
      })
    ).toBe(false);
  });
});
