import { WEBGPU_UNAVAILABLE_MESSAGE } from "./constants";
import type { LlmErrorDetail } from "./types";

const GENERIC_LLM_ERROR_MESSAGE =
  "AI文脈チェックを実行できませんでした。ルールベースの検出結果は引き続き利用できます。";

const MODEL_FETCH_ERROR_MESSAGE =
  "ローカルAIモデルの取得に失敗しました。モデル配信元への接続がブロックされている可能性があります。ルールベースの検出結果は引き続き利用できます。";

const JSON_PARSE_ERROR_MESSAGE =
  "AI文脈チェックの結果を読み取れませんでした。ルールベースの検出結果は引き続き利用できます。";

const STORAGE_ERROR_MESSAGE =
  "ローカルAIモデルの保存領域を確保できませんでした。ブラウザのサイトデータや空き容量を確認してください。ルールベースの検出結果は引き続き利用できます。";

const MEMORY_ERROR_MESSAGE =
  "ローカルAIモデルの実行に必要なメモリを確保できませんでした。ほかのタブやアプリを閉じてから再試行してください。ルールベースの検出結果は引き続き利用できます。";

const WORKER_ERROR_MESSAGE =
  "AI文脈チェック用のWorkerを起動できませんでした。ページを再読み込みしてから再試行してください。ルールベースの検出結果は引き続き利用できます。";

const WASM_ERROR_MESSAGE =
  "AI文脈チェック用の実行ファイルを読み込めませんでした。ブラウザのキャッシュ削除後に再試行してください。ルールベースの検出結果は引き続き利用できます。";

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return typeof error === "string" ? error : "";
}

function sanitizeTechnicalDetail(message: string): string | undefined {
  const normalized = message.replace(/\s+/g, " ").trim();
  if (normalized.length === 0) {
    return undefined;
  }

  return normalized.slice(0, 260);
}

function detail(kind: LlmErrorDetail["kind"], message: string, hint: string, rawMessage: string): LlmErrorDetail {
  const technicalDetail = sanitizeTechnicalDetail(rawMessage);
  return {
    kind,
    message,
    hint,
    ...(technicalDetail ? { technicalDetail } : {})
  };
}

export function classifyLlmError(error: unknown): LlmErrorDetail {
  const message = errorMessage(error);
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes("err_network_access_denied") ||
    lowerMessage.includes("failed to fetch") ||
    lowerMessage.includes("networkerror") ||
    lowerMessage.includes("load failed") ||
    lowerMessage.includes("huggingface.co") ||
    lowerMessage.includes("raw.githubusercontent.com") ||
    lowerMessage.includes("cors") ||
    lowerMessage.includes("status code 401") ||
    lowerMessage.includes("status code 403") ||
    lowerMessage.includes("status code 404") ||
    (lowerMessage.includes("model") && lowerMessage.includes("fetch"))
  ) {
    return detail(
      "model_fetch",
      MODEL_FETCH_ERROR_MESSAGE,
      "Hugging FaceやGitHub rawへのアクセス、プロキシ、セキュリティソフト、広告ブロック、社内ネットワーク制限を確認してください。",
      message
    );
  }

  if (
    lowerMessage.includes("quota") ||
    lowerMessage.includes("indexeddb") ||
    lowerMessage.includes("cache") ||
    lowerMessage.includes("storage") ||
    lowerMessage.includes("disk") ||
    lowerMessage.includes("not enough space")
  ) {
    return detail(
      "storage",
      STORAGE_ERROR_MESSAGE,
      "Chrome DevToolsのApplication > Storageから127.0.0.1のサイトデータを削除し、ディスク空き容量も確認してください。",
      message
    );
  }

  if (
    lowerMessage.includes("out of memory") ||
    lowerMessage.includes("memory access out of bounds") ||
    lowerMessage.includes("allocation") ||
    lowerMessage.includes("vram") ||
    lowerMessage.includes("gpu memory")
  ) {
    return detail(
      "memory",
      MEMORY_ERROR_MESSAGE,
      "Intel UHD Graphics 620ではWebLLMが重い場合があります。ほかのタブを閉じ、通常ウィンドウで再試行してください。",
      message
    );
  }

  if (
    lowerMessage.includes("webgpu") ||
    lowerMessage.includes("gpuadapter") ||
    lowerMessage.includes("requestadapter") ||
    lowerMessage.includes("requestdevice") ||
    lowerMessage.includes("navigator.gpu") ||
    lowerMessage.includes("no available adapters") ||
    lowerMessage.includes("device lost")
  ) {
    return detail(
      "webgpu",
      WEBGPU_UNAVAILABLE_MESSAGE,
      "chrome://gpu のDawn InfoでD3D12 backendがAvailableか確認してください。Chromeの完全再起動も有効です。",
      message
    );
  }

  if (
    lowerMessage.includes("worker") ||
    lowerMessage.includes("module script") ||
    lowerMessage.includes("failed to construct") ||
    lowerMessage.includes("imported module") ||
    lowerMessage.includes("already been disposed") ||
    lowerMessage.includes("disposed object")
  ) {
    return detail(
      "worker",
      WORKER_ERROR_MESSAGE,
      "WebLLMの内部WorkerまたはGPUオブジェクトが破棄済みになっています。ページを再読み込みしてから再試行してください。",
      message
    );
  }

  if (lowerMessage.includes("wasm") || lowerMessage.includes("webassembly") || lowerMessage.includes("compile") || lowerMessage.includes("instantiate")) {
    return detail("wasm", WASM_ERROR_MESSAGE, "Chromeのサイトデータ削除後、WASMファイルを再取得してから再試行してください。", message);
  }

  if (message.includes("AI文脈チェックの結果を読み取れませんでした") || lowerMessage.includes("json")) {
    return detail("json_parse", JSON_PARSE_ERROR_MESSAGE, "ルールベース検出結果は維持されています。必要なら再実行してください。", message);
  }

  return detail(
    "unknown",
    GENERIC_LLM_ERROR_MESSAGE,
    "DevTools Consoleの赤いエラー、Networkタブの失敗リクエスト、chrome://gpu のDawn Infoを確認してください。",
    message
  );
}

export function formatLlmErrorMessage(error: unknown): string {
  return classifyLlmError(error).message;
}
