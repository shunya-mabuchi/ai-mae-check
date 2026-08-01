import { describe, expect, it } from "vitest";
import {
  createDemoRuleDetectionState,
  createDemoTextReplacementState,
  demoWorkbenchReducer
} from "./demoWorkbenchState";
import {
  createLoadingLlmUiState,
  createProgressLlmUiState
} from "./demoLlmUiState";

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
      },
      activeLlmRequestId: null
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
    expect(state.activeLlmRequestId).toBeNull();
  });

  it("Reducerで検出候補の選択状態を切り替える", () => {
    const detected = createDemoRuleDetectionState(
      "メールは taro@example.com です。"
    );
    const findingId = detected.selectedRuleFindingIds[0]!;

    const cleared = demoWorkbenchReducer(detected, {
      type: "rule_finding_toggled",
      id: findingId
    });
    const restored = demoWorkbenchReducer(cleared, {
      type: "rule_finding_toggled",
      id: findingId
    });

    expect(cleared.selectedRuleFindingIds).toEqual([]);
    expect(restored.selectedRuleFindingIds).toEqual([findingId]);
  });

  it("本文変更後に遅れて返ったAI結果を反映しない", () => {
    const detected = createDemoRuleDetectionState(
      "メールは taro@example.com です。"
    );
    const running = demoWorkbenchReducer(detected, {
      type: "llm_started",
      requestId: 7,
      detection: detected.detection!,
      selectedRuleFindingIds: detected.selectedRuleFindingIds,
      uiState: createLoadingLlmUiState()
    });
    const edited = demoWorkbenchReducer(running, {
      type: "text_changed",
      text: "変更後の本文"
    });
    const staleCompletion = demoWorkbenchReducer(edited, {
      type: "llm_completed",
      requestId: 7,
      candidates: [],
      selectedCandidateIds: [],
      uiState: {
        status: "empty",
        message: "追加候補はありません。",
        errorDetail: null
      }
    });

    expect(staleCompletion).toBe(edited);
    expect(staleCompletion.text).toBe("変更後の本文");
    expect(staleCompletion.llmUiState.status).toBe("idle");
  });

  it("同じAIリクエストの進捗だけを反映する", () => {
    const detected = createDemoRuleDetectionState(
      "メールは taro@example.com です。"
    );
    const running = demoWorkbenchReducer(detected, {
      type: "llm_started",
      requestId: 3,
      detection: detected.detection!,
      selectedRuleFindingIds: detected.selectedRuleFindingIds,
      uiState: createLoadingLlmUiState()
    });
    const ignored = demoWorkbenchReducer(running, {
      type: "llm_progressed",
      requestId: 2,
      uiState: createProgressLlmUiState({
        phase: "analyzing",
        progress: 0.5,
        message: "古い処理です。"
      })
    });
    const accepted = demoWorkbenchReducer(running, {
      type: "llm_progressed",
      requestId: 3,
      uiState: createProgressLlmUiState({
        phase: "analyzing",
        progress: 0.5,
        message: "文脈リスクを確認しています。"
      })
    });

    expect(ignored).toBe(running);
    expect(accepted.llmUiState.status).toBe("analyzing");
    expect(accepted.llmUiState.message).toBe(
      "文脈リスクを確認しています。"
    );
  });
});
