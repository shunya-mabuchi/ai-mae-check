import { describe, expect, it } from "vitest";
import type { ContextAnalysisResult, LlmErrorDetail, LlmProgress } from "@ai-mae-check/llm";
import {
  createEmptyInputLlmUiState,
  createErrorLlmUiState,
  createIdleLlmUiState,
  createLlmCompleteUiState,
  createLlmResultUiState,
  createLoadingLlmUiState,
  createProgressLlmUiState,
  createWebGpuUnavailableLlmUiState,
  shouldShowDemoLlmError
} from "./demoLlmUiState";

describe("demoLlmUiState", () => {
  it("初期状態を返す", () => {
    expect(createIdleLlmUiState()).toEqual({
      status: "idle",
      message: "AI文脈チェックは手動で実行できます。",
      errorDetail: null
    });
  });

  it("空入力とWebGPU非対応をエラー状態にする", () => {
    expect(createEmptyInputLlmUiState()).toMatchObject({
      status: "error",
      message: "先に送信前テキストを入力してください。",
      errorDetail: null
    });

    expect(createWebGpuUnavailableLlmUiState()).toMatchObject({
      status: "error",
      errorDetail: {
        kind: "webgpu",
        hint: "chrome://gpu のDawn InfoでD3D12 backendがAvailableか確認してください。"
      }
    });
  });

  it("ロード中と進捗状態を返す", () => {
    expect(createLoadingLlmUiState().status).toBe("loading");

    const progress: LlmProgress = {
      phase: "analyzing",
      message: "文脈リスクを確認しています。"
    };

    expect(createProgressLlmUiState(progress)).toEqual({
      status: "analyzing",
      message: "文脈リスクを確認しています。",
      errorDetail: null
    });
  });

  it("候補数に応じて完了表示を切り替える", () => {
    expect(createLlmCompleteUiState(2)).toEqual({
      status: "done",
      message: "AI文脈チェックで注意候補が見つかりました。",
      errorDetail: null
    });

    expect(createLlmCompleteUiState(0)).toEqual({
      status: "empty",
      message: "AI文脈チェックでは追加の注意候補は見つかりませんでした。ただし、安全を保証するものではありません。",
      errorDetail: null
    });
  });

  it("エラー詳細をUI stateに変換する", () => {
    const errorDetail: LlmErrorDetail = {
      kind: "json_parse",
      message: "AI文脈チェックの結果を読み取れませんでした。",
      hint: "必要なら再実行してください。"
    };

    expect(createErrorLlmUiState(errorDetail)).toEqual({
      status: "error",
      message: "AI文脈チェックの結果を読み取れませんでした。",
      errorDetail
    });
  });

  it("json_parseはデモでも非致命的な結果として扱う", () => {
    const result: ContextAnalysisResult = {
      candidates: [],
      summary: "AI文脈チェックの結果を読み取れませんでした。",
      rawText: "",
      modelId: "Llama-3.2-1B-Instruct-q4f32_1-MLC",
      elapsedMs: 10,
      error: "AI文脈チェックの結果を読み取れませんでした。",
      errorDetail: {
        kind: "json_parse",
        message: "AI文脈チェックの結果を読み取れませんでした。",
        hint: "必要なら再実行してください。"
      }
    };

    expect(shouldShowDemoLlmError(result)).toBe(false);
    expect(createLlmResultUiState(result.candidates.length, result.errorDetail)).toEqual({
      status: "empty",
      message: "AI文脈チェックの出力形式は読み取れませんでした。ルールベース検出結果は維持されています。必要なら再実行してください。",
      errorDetail: null
    });
  });

  it("WorkerやWebGPUの失敗はデモでも実行不能エラーとして扱う", () => {
    const result: Pick<ContextAnalysisResult, "error" | "errorDetail"> = {
      error: "AI文脈チェックを実行できませんでした。",
      errorDetail: {
        kind: "worker",
        message: "AI文脈チェックを実行できませんでした。",
        hint: "ページを再読み込みしてから再試行してください。"
      }
    };

    expect(shouldShowDemoLlmError(result)).toBe(true);
  });
});
