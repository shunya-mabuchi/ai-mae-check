import { describe, expect, it } from "vitest";
import {
  createDemoRuleDetectionState,
  createDemoTextReplacementState
} from "./demoWorkbenchState";

describe("demoWorkbenchState", () => {
  it("テキスト差し替え時は検出結果・選択状態・AI候補・コピー文言を初期化する", () => {
    const state = createDemoTextReplacementState("サンプル文です。");

    expect(state).toEqual({
      text: "サンプル文です。",
      detection: null,
      selectedRuleFindingIds: [],
      llmCandidates: [],
      selectedCandidateIds: [],
      copyMessage: "",
      llmUiState: {
        status: "idle",
        message: "AI文脈チェックは手動で実行できます。",
        errorDetail: null
      }
    });
  });

  it("ルール検出時は検出結果と選択IDを作り、AI候補とコピー文言を初期化する", () => {
    const state = createDemoRuleDetectionState("メールは taro@example.com です。");

    expect(state.text).toBe("メールは taro@example.com です。");
    expect(state.detection?.summary.total).toBe(1);
    expect(state.selectedRuleFindingIds).toEqual(state.detection?.findings.map((finding) => finding.id));
    expect(state.llmCandidates).toEqual([]);
    expect(state.selectedCandidateIds).toEqual([]);
    expect(state.copyMessage).toBe("");
    expect(state.llmUiState.status).toBe("idle");
  });
});
