import { describe, expect, it } from "vitest";
import { classifyLlmError, DEFAULT_MODEL_ID, formatLlmErrorMessage } from "../src";

describe("formatLlmErrorMessage", () => {
  it("デフォルトモデルは正式対応モデルのLlama 3.2 1B q4f32にする", () => {
    expect(DEFAULT_MODEL_ID).toContain("q4f32_1");
    expect(DEFAULT_MODEL_ID).toBe("Llama-3.2-1B-Instruct-q4f32_1-MLC");
  });

  it("モデル取得のネットワーク失敗を日本語で説明する", () => {
    const message = formatLlmErrorMessage(new Error("net::ERR_NETWORK_ACCESS_DENIED https://huggingface.co/model"));

    expect(message).toContain("ローカルAIモデルの取得に失敗しました");
    expect(message).toContain("ルールベースの検出結果は引き続き利用できます");
  });

  it("モデル取得失敗を分類して診断ヒントを返す", () => {
    const detail = classifyLlmError(new Error("Failed to fetch https://huggingface.co/mlc-ai/model"));

    expect(detail.kind).toBe("model_fetch");
    expect(detail.message).toContain("ローカルAIモデルの取得に失敗しました");
    expect(detail.hint).toContain("Hugging Face");
    expect(detail.technicalDetail).toContain("Failed to fetch");
  });

  it("ブラウザ保存領域の失敗を分類する", () => {
    const detail = classifyLlmError(new Error("QuotaExceededError: IndexedDB storage quota exceeded"));

    expect(detail.kind).toBe("storage");
    expect(detail.message).toContain("保存領域");
  });

  it("メモリ不足を分類する", () => {
    const detail = classifyLlmError(new Error("WebAssembly memory access out of bounds"));

    expect(detail.kind).toBe("memory");
    expect(detail.message).toContain("メモリ");
  });

  it("WebGPUデバイス取得失敗を分類する", () => {
    const detail = classifyLlmError(new Error("requestDevice failed: device lost"));

    expect(detail.kind).toBe("webgpu");
    expect(detail.message).toContain("AI文脈チェックを利用できません");
  });

  it("WebGPUアダプタ未取得はモデル選択以前の問題として分類する", () => {
    const detail = classifyLlmError(new Error("No available WebGPU adapters"));

    expect(detail.kind).toBe("webgpu");
    expect(detail.message).toContain("WebGPUアダプタを取得できません");
    expect(detail.hint).toContain("モデルを変更しても解消しません");
  });

  it("WebGPU推論中のGPUBuffer mapAsync失敗を分類する", () => {
    const detail = classifyLlmError(
      new Error("AbortError: Failed to execute 'mapAsync' on 'GPUBuffer': Buffer was unmapped before mapping was resolved.")
    );

    expect(detail.kind).toBe("webgpu");
    expect(detail.message).toContain("GPU実行が中断されました");
    expect(detail.hint).toContain("Chromeの完全再起動");
  });

  it("Worker起動失敗を分類する", () => {
    const detail = classifyLlmError(new Error("Failed to construct 'Worker': script could not be loaded"));

    expect(detail.kind).toBe("worker");
    expect(detail.message).toContain("Worker");
  });

  it("破棄済みオブジェクトのエラーをWorker寿命系として分類する", () => {
    const detail = classifyLlmError(new Error("Object has already been disposed"));

    expect(detail.kind).toBe("worker");
    expect(detail.hint).toContain("破棄済み");
    expect(detail.technicalDetail).toContain("Object has already been disposed");
  });

  it("WASM読込失敗を分類する", () => {
    const detail = classifyLlmError(new Error("WebAssembly.compile failed"));

    expect(detail.kind).toBe("wasm");
    expect(detail.message).toContain("実行ファイル");
  });

  it("不明なエラーでは汎用メッセージにする", () => {
    const message = formatLlmErrorMessage(new Error("unknown internal error"));

    expect(message).toBe("AI文脈チェックを実行できませんでした。ルールベースの検出結果は引き続き利用できます。");
  });
});
