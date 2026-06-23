import { describe, expect, it } from "vitest";
import {
  CONTEXT_ANALYSIS_EMPTY_MESSAGE,
  CONTEXT_ANALYSIS_FOUND_MESSAGE,
  createContextAnalysisCompleteMessage,
  createContextAnalysisResultMessage
} from "../src";
import { buildLlmErrorDetail } from "./testBuilders";

describe("resultMessage", () => {
  it("候補件数に応じた標準の完了メッセージを返す", () => {
    expect(createContextAnalysisCompleteMessage(2)).toBe(CONTEXT_ANALYSIS_FOUND_MESSAGE);
    expect(createContextAnalysisCompleteMessage(0)).toBe(CONTEXT_ANALYSIS_EMPTY_MESSAGE);
  });

  it("JSON読み取り失敗のsummaryは非致命フォールバックメッセージへ丸める", () => {
    expect(
      createContextAnalysisCompleteMessage(
        0,
        "AI文脈チェックの結果を読み取れませんでした。ルールベースの検出結果は引き続き利用できます。"
      )
    ).toBe("ルールベース検出結果で安全化できます。AI文脈チェックは必要に応じて再実行してください。");
  });

  it("json_parseの詳細がある結果は候補件数に応じて非致命メッセージを返す", () => {
    const detail = buildLlmErrorDetail({
      hint: "ルールベース検出結果は維持されています。必要なら再実行してください。"
    });

    expect(createContextAnalysisResultMessage({ candidateCount: 0, errorDetail: detail })).toBe(
      "ルールベース検出結果で安全化できます。AI文脈チェックは必要に応じて再実行してください。"
    );
    expect(createContextAnalysisResultMessage({ candidateCount: 2, errorDetail: detail })).toBe(
      "ブラウザ内の補助検出で注意候補を確認しました。安全化対象を選んで続行できます。"
    );
  });

  it("json_parse以外の詳細は標準完了メッセージに影響しない", () => {
    const detail = buildLlmErrorDetail({
      kind: "worker",
      message: "AI文脈チェックを実行できませんでした。",
      hint: "ページを再読み込みしてから再試行してください。"
    });

    expect(createContextAnalysisResultMessage({ candidateCount: 1, errorDetail: detail })).toBe(
      CONTEXT_ANALYSIS_FOUND_MESSAGE
    );
  });
});
