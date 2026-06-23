import { describe, expect, it } from "vitest";
import {
  classifyLlmError,
  createJsonParseFallbackMessage,
  DEFAULT_MODEL_ID,
  formatLlmErrorMessage,
  isContextAnalysisExecutionError,
  sanitizeLlmErrorDetail,
  type ContextAnalysisResult
} from "../src";
import { buildLlmErrorDetail } from "./testBuilders";

describe("formatLlmErrorMessage", () => {
  it("デフォルトモデルは動作実績を優先してLlama 3.2 1B q4f32にする", () => {
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
    expect(detail.hint).toContain("サイトデータ");
  });

  it("メモリ不足を分類する", () => {
    const detail = classifyLlmError(new Error("WebAssembly memory access out of bounds"));

    expect(detail.kind).toBe("memory");
    expect(detail.message).toContain("メモリ");
  });

  it("WebGPU非対応を分類する", () => {
    const detail = classifyLlmError(new Error("navigator.gpu is undefined because WebGPU is not supported"));

    expect(detail.kind).toBe("webgpu");
    expect(detail.message).toContain("AI文脈チェックを利用できません");
    expect(detail.hint).toContain("chrome://gpu");
  });

  it("WebGPU Adapter取得失敗を分類する", () => {
    const detail = classifyLlmError(new Error("No available WebGPU adapters"));

    expect(detail.kind).toBe("webgpu");
    expect(detail.message).toContain("WebGPUアダプタを取得できませんでした");
    expect(detail.hint).toContain("モデルを変更しても解消しません");
  });

  it("compatible GPUが見つからないWebLLM内部エラーをAdapter取得失敗として分類する", () => {
    const detail = classifyLlmError(
      new Error(
        "Unable to find a compatible GPU. Please check if your device has a GPU properly set up and if your browser supports WebGPU."
      )
    );

    expect(detail.kind).toBe("webgpu");
    expect(detail.message).toContain("WebGPUアダプタを取得できませんでした");
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
    expect(detail.message).toContain("Workerを起動できませんでした");
  });

  it("破棄済みオブジェクトのエラーをWorker寿命系として分類する", () => {
    const detail = classifyLlmError(new Error("Object has already been disposed"));

    expect(detail.kind).toBe("worker");
    expect(detail.hint).toContain("タブも再読み込み");
    expect(detail.technicalDetail).toContain("Object has already been disposed");
  });

  it("WASM読み込み失敗を分類する", () => {
    const detail = classifyLlmError(new Error("WebAssembly.compile failed"));

    expect(detail.kind).toBe("wasm");
    expect(detail.message).toContain("実行ファイル");
  });

  it("AbortErrorやtimeoutをタイムアウトとして分類する", () => {
    const detail = classifyLlmError(new Error("AbortError: the WebLLM request timed out"));

    expect(detail.kind).toBe("timeout");
    expect(detail.message).toContain("時間内に完了しませんでした");
    expect(detail.hint).toContain("入力を短く");
  });

  it("出力形式を読み取れない日本語メッセージをjson_parseとして分類する", () => {
    const detail = classifyLlmError(new Error("AI文脈チェックの結果を読み取れませんでした"));

    expect(detail.kind).toBe("json_parse");
    expect(detail.message).toBe(
      "AI文脈チェックの結果を読み取れませんでした。ルールベースの検出結果は引き続き利用できます。"
    );
  });

  it("不明なエラーでは汎用メッセージにする", () => {
    const message = formatLlmErrorMessage(new Error("unknown internal error"));

    expect(message).toBe("AI文脈チェックを実行できませんでした。ルールベースの検出結果は引き続き利用できます。");
  });

  it("json_parseは実行不能エラーとして扱わない", () => {
    const result: ContextAnalysisResult = {
      candidates: [],
      summary: "AI文脈チェックの結果を読み取れませんでした。",
      rawText: "",
      modelId: DEFAULT_MODEL_ID,
      elapsedMs: 1,
      error: "AI文脈チェックの結果を読み取れませんでした。",
      errorDetail: buildLlmErrorDetail()
    };

    expect(isContextAnalysisExecutionError(result)).toBe(false);
  });

  it("errorDetailが欠けたjson_parseメッセージも実行不能エラーとして扱わない", () => {
    expect(
      isContextAnalysisExecutionError({
        error: "AI文脈チェックの結果を読み取れませんでした。ルールベースの検出結果は引き続き利用できます。"
      })
    ).toBe(false);

    expect(
      isContextAnalysisExecutionError({
        error: "JSON parse failed while reading WebLLM output"
      })
    ).toBe(false);
  });

  it("WorkerやWebGPUの失敗は実行不能エラーとして扱う", () => {
    expect(
      isContextAnalysisExecutionError({
        error: "AI文脈チェックを実行できませんでした。",
        errorDetail: buildLlmErrorDetail({
          kind: "worker",
          message: "AI文脈チェックを実行できませんでした。",
          hint: "ページを再読み込みしてから再試行してください。"
        })
      })
    ).toBe(true);

    expect(
      isContextAnalysisExecutionError({
        error: "AI文脈チェックを利用できません。",
        errorDetail: buildLlmErrorDetail({
          kind: "webgpu",
          message: "AI文脈チェックを利用できません。",
          hint: "WebGPUを確認してください。"
        })
      })
    ).toBe(true);
  });

  it("errorがない結果は実行不能エラーとして扱わない", () => {
    expect(isContextAnalysisExecutionError({})).toBe(false);
  });

  it("json_parseの非致命フォールバック文言を候補件数から返す", () => {
    expect(createJsonParseFallbackMessage(0)).toBe(
      "ルールベース検出結果で安全化できます。AI文脈チェックは必要に応じて再実行してください。"
    );
    expect(createJsonParseFallbackMessage(2)).toBe(
      "ブラウザ内の補助検出で注意候補を確認しました。安全化対象を選んで続行できます。"
    );
  });

  it("technicalDetailへユーザー本文を混ぜない", () => {
    const detail = classifyLlmError(
      new Error(
        'Failed to construct "Worker". prompt: 候補者の山田花子さんへ Project Blue Bridge の評価メモを送ります。 input: "顧客Aの社外秘方針も転記します。"'
      )
    );

    expect(detail.kind).toBe("worker");
    expect(detail.technicalDetail).toContain("[redacted]");
    expect(detail.technicalDetail).not.toContain("山田花子");
    expect(detail.technicalDetail).not.toContain("Project Blue Bridge");
    expect(detail.technicalDetail).not.toContain("顧客Aの社外秘方針");
  });

  it("未ラベルの短い機微情報もtechnicalDetailから伏せる", () => {
    const detail = classifyLlmError(new Error("Worker failed near taro@example.com"));

    expect(detail.kind).toBe("worker");
    expect(detail.technicalDetail).toContain("[redacted]");
    expect(detail.technicalDetail).not.toContain("taro@example.com");
  });

  it("sourceTextと一致する本文断片をtechnicalDetailから伏せる", () => {
    const detail = sanitizeLlmErrorDetail(
      classifyLlmError(new Error("Worker failed near Project Blue Bridge and 山田花子")),
      "Project Blue Bridge の提案メモです。候補者の山田花子さんについて扱います。"
    );

    expect(detail.technicalDetail).toContain("[redacted]");
    expect(detail.technicalDetail).not.toContain("Project");
    expect(detail.technicalDetail).not.toContain("Blue");
    expect(detail.technicalDetail).not.toContain("Bridge");
    expect(detail.technicalDetail).not.toContain("山田花子");
  });

  it("埋め込み済みerrorDetailのmessageとhintも信用せず伏せる", () => {
    const detail = classifyLlmError(
      Object.assign(new Error("wrapped"), {
        llmErrorDetail: {
          kind: "worker",
          message: "Worker failed for taro@example.com",
          hint: "090-1234-5678 に関する入力を確認してください。",
          technicalDetail: "Project Blue Bridge failed"
        }
      })
    );

    expect(detail.message).toContain("[redacted]");
    expect(detail.message).not.toContain("taro@example.com");
    expect(detail.hint).toContain("[redacted]");
    expect(detail.hint).not.toContain("090-1234-5678");
  });
});
