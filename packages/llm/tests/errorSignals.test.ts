import { describe, expect, it } from "vitest";
import {
  classifyLlmErrorSignal,
  createJsonParseFallbackMessage,
  getLlmErrorSignalCopy,
  isJsonParseLlmErrorMessage
} from "../src/errorSignals";

describe("errorSignals", () => {
  it("モデル取得失敗の生メッセージを分類する", () => {
    const signal = classifyLlmErrorSignal("Failed to fetch https://huggingface.co/mlc-ai/model");

    expect(signal.kind).toBe("model_fetch");
    expect(signal.message).toContain("ローカルAIモデルの取得に失敗しました");
    expect(signal.hint).toContain("Hugging Face");
  });

  it("WebGPUアダプタ未取得とGPU実行中断を別の文言へ分類する", () => {
    const adapterSignal = classifyLlmErrorSignal("No available WebGPU adapters");
    const runtimeSignal = classifyLlmErrorSignal(
      "AbortError: Failed to execute 'mapAsync' on 'GPUBuffer': Buffer was unmapped before mapping was resolved."
    );

    expect(adapterSignal.kind).toBe("webgpu");
    expect(adapterSignal.message).toContain("WebGPUアダプタを取得できませんでした");
    expect(adapterSignal.hint).toContain("モデルを変更しても解消しません");
    expect(runtimeSignal.kind).toBe("webgpu");
    expect(runtimeSignal.message).toContain("GPU実行が中断されました");
    expect(runtimeSignal.hint).toContain("Chromeの完全再起動");
  });

  it("Worker寿命系とJSON読み取り失敗を分類する", () => {
    const workerSignal = classifyLlmErrorSignal("Object has already been disposed");
    const jsonSignal = classifyLlmErrorSignal("AI文脈チェックの結果を読み取れませんでした");

    expect(workerSignal.kind).toBe("worker");
    expect(workerSignal.hint).toContain("タブも再読み込み");
    expect(jsonSignal.kind).toBe("json_parse");
    expect(isJsonParseLlmErrorMessage("JSON parse failed while reading WebLLM output")).toBe(true);
  });

  it("AbortErrorやtimeoutをタイムアウトとして分類する", () => {
    const signal = classifyLlmErrorSignal("AbortError: WebLLM request timed out");

    expect(signal.kind).toBe("timeout");
    expect(signal.message).toContain("時間内に完了しませんでした");
  });

  it("JSON読み取り失敗の非致命フォールバック文言を候補件数から返す", () => {
    expect(createJsonParseFallbackMessage(0)).toBe(
      "ルールベース検出結果で安全化できます。AI文脈チェックは必要に応じて再実行してください。"
    );
    expect(createJsonParseFallbackMessage(1)).toBe(
      "ブラウザ内の補助検出で注意候補を確認しました。安全化対象を選んで続行できます。"
    );
  });

  it("共通関数から日本語AI文言を参照できる", () => {
    expect(getLlmErrorSignalCopy("model_fetch")).toEqual({
      kind: "model_fetch",
      message:
        "ローカルAIモデルの取得に失敗しました。モデル配信元への接続がブロックされている可能性があります。ルールベースの検出結果は引き続き利用できます。",
      hint: "Hugging FaceやGitHub rawへのアクセス、プロキシ、セキュリティソフト、広告ブロッカー、社内ネットワーク制限を確認してください。"
    });
    expect(getLlmErrorSignalCopy("webgpu", "adapter_unavailable").message).toContain(
      "WebGPUアダプタを取得できませんでした"
    );
    expect(getLlmErrorSignalCopy("json_parse").hint).toContain("ルールベース検出結果は維持されています");
    expect(getLlmErrorSignalCopy("timeout").hint).toContain("入力を短く");
  });
});
