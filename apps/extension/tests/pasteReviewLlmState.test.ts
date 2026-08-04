import { describe, expect, it } from "vitest";
import {
  createPasteReviewLlmCompleteMessage,
  createPasteReviewLlmResultState,
  formatPasteReviewLlmStatusMessage,
  PASTE_REVIEW_LLM_DISABLED_MESSAGE,
  PASTE_REVIEW_LLM_INITIAL_MESSAGE,
  PASTE_REVIEW_LLM_LOADING_MESSAGE,
  shouldAutoRunPasteReviewLlm
} from "../src/lib/pasteReviewLlmState";

const candidate = {
  id: "candidate-1",
  category: "person_name" as const,
  surface: "山田花子さん",
  label: "人名候補",
  reason: "人名候補です。",
  riskLevel: "medium" as const,
  suggestedPlaceholder: "[PERSON_1]",
  confidence: 0.9
};

describe("pasteReviewLlmState", () => {
  it("初期・無効・ロード中の文言を返す", () => {
    expect(PASTE_REVIEW_LLM_INITIAL_MESSAGE).toContain("手動");
    expect(PASTE_REVIEW_LLM_DISABLED_MESSAGE).toContain("無効");
    expect(PASTE_REVIEW_LLM_LOADING_MESSAGE).toContain("初回のみ時間がかかる場合があります");
  });

  it("候補数に応じた完了文言を返す", () => {
    expect(createPasteReviewLlmCompleteMessage(1)).toContain("注意候補が見つかりました");
    expect(createPasteReviewLlmCompleteMessage(0)).toContain("安全を保証するものではありません");
  });

  it("結果を候補・初期選択・表示状態へまとめる", () => {
    expect(createPasteReviewLlmResultState({
      candidates: [candidate],
      summary: "完了",
      errorDetail: undefined
    })).toEqual(expect.objectContaining({
      candidates: [candidate],
      selectedCandidateIds: ["candidate-1"],
      emptyCandidateMessageVisible: false
    }));
  });

  it("正常完了して候補0件のときだけ空候補メッセージを許可する", () => {
    expect(createPasteReviewLlmResultState({
      candidates: [], summary: "完了", errorDetail: undefined
    }).emptyCandidateMessageVisible).toBe(true);
    expect(createPasteReviewLlmResultState({
      candidates: [],
      summary: "失敗",
      errorDetail: { kind: "wasm", message: "失敗", hint: "確認してください" }
    }).emptyCandidateMessageVisible).toBe(false);
  });

  it("診断メモと技術詳細を整形する", () => {
    expect(formatPasteReviewLlmStatusMessage("失敗", {
      kind: "worker",
      message: "失敗",
      hint: "再読み込みしてください。",
      technicalDetail: "Worker failed"
    })).toContain("診断メモ: 再読み込みしてください。");
  });

  it("通常モードかつ自動設定のときだけ自動実行する", () => {
    const auto = { enabled: true, mode: "auto" as const };
    expect(shouldAutoRunPasteReviewLlm("default", auto)).toBe(true);
    expect(shouldAutoRunPasteReviewLlm("paste_guard", auto)).toBe(false);
    expect(shouldAutoRunPasteReviewLlm("default", { enabled: true, mode: "manual" })).toBe(false);
  });
});
