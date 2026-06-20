import { WEBGPU_UNAVAILABLE_MESSAGE } from "./constants";
import type { LlmErrorDetail } from "./types";

const GENERIC_LLM_ERROR_MESSAGE =
  "AI文脈チェックを実行できませんでした。ルールベースの検出結果は引き続き利用できます。";

const MODEL_FETCH_ERROR_MESSAGE =
  "ローカルAIモデルの取得に失敗しました。モデル配信元への接続がブロックされている可能性があります。ルールベースの検出結果は引き続き利用できます。";

const JSON_PARSE_ERROR_MESSAGE =
  "AI文脈チェックの出力形式を読み取れませんでした。ルールベース検出とブラウザ内の補助検出は引き続き利用できます。";
const JSON_PARSE_RULE_BASED_FALLBACK_MESSAGE =
  "ルールベース検出結果で安全化できます。AI文脈チェックは必要に応じて再実行してください。";
const JSON_PARSE_RESIDUAL_FALLBACK_MESSAGE =
  "ブラウザ内の補助検出で注意候補を確認しました。安全化対象を選んで続行できます。";

const STORAGE_ERROR_MESSAGE =
  "ローカルAIモデルの保存領域を確保できませんでした。ブラウザのサイトデータや空き容量を確認してください。ルールベースの検出結果は引き続き利用できます。";

const MEMORY_ERROR_MESSAGE =
  "ローカルAIモデルの実行に必要なメモリを確保できませんでした。ほかのタブやアプリを閉じてから再試行してください。ルールベースの検出結果は引き続き利用できます。";

const WEBGPU_ADAPTER_UNAVAILABLE_MESSAGE =
  "WebGPUアダプタを取得できませんでした。このブラウザまたは端末ではAI文脈チェックを利用できません。ルールベースの検出は引き続き利用できます。";

const WEBGPU_RUNTIME_ERROR_MESSAGE =
  "ローカルAIモデルのGPU実行が中断されました。ルールベースの検出結果は引き続き利用できます。";

const WORKER_ERROR_MESSAGE =
  "AI文脈チェック用のWorkerを起動できませんでした。ページを再読み込みしてから再試行してください。ルールベースの検出結果は引き続き利用できます。";

const WASM_ERROR_MESSAGE =
  "AI文脈チェック用の実行ファイルを読み込めませんでした。ブラウザのキャッシュ削除後に再試行してください。ルールベースの検出結果は引き続き利用できます。";

export type LlmErrorSignal = Pick<LlmErrorDetail, "kind" | "message" | "hint">;
type LlmErrorVariant = "adapter_unavailable" | "runtime";

interface LlmErrorCopy extends LlmErrorSignal {
  variant?: LlmErrorVariant;
}

interface LlmErrorRule {
  id: string;
  match: (normalizedMessage: string, originalMessage: string) => boolean;
  copy: (normalizedMessage: string) => LlmErrorCopy;
}

function signal(kind: LlmErrorDetail["kind"], message: string, hint: string, variant?: LlmErrorVariant): LlmErrorCopy {
  return {
    kind,
    message,
    hint,
    ...(variant ? { variant } : {})
  };
}

const errorCopies = {
  model_fetch: signal(
    "model_fetch",
    MODEL_FETCH_ERROR_MESSAGE,
    "Hugging FaceやGitHub rawへのアクセス、プロキシ、セキュリティソフト、広告ブロック、社内ネットワーク制限を確認してください。"
  ),
  storage: signal(
    "storage",
    STORAGE_ERROR_MESSAGE,
    "Chrome DevToolsのApplication > Storageから127.0.0.1のサイトデータを削除し、ディスク空き容量も確認してください。"
  ),
  memory: signal(
    "memory",
    MEMORY_ERROR_MESSAGE,
    "Intel UHD Graphics 620ではWebLLMが重い場合があります。ほかのタブを閉じ、通常ウィンドウで再試行してください。"
  ),
  webgpu: {
    default: signal(
      "webgpu",
      WEBGPU_UNAVAILABLE_MESSAGE,
      "chrome://gpu のDawn InfoでD3D12 backendがAvailableか確認してください。Chromeの完全再起動も有効です。"
    ),
    adapter_unavailable: signal(
      "webgpu",
      WEBGPU_ADAPTER_UNAVAILABLE_MESSAGE,
      "この状態はWebLLMモデルを変更しても解消しません。chrome://gpu のDawn InfoでD3D12 backendがAvailableか、DawnのWebGPU StatusがBlocklistedではないかを確認してください。",
      "adapter_unavailable"
    ),
    runtime: signal(
      "webgpu",
      WEBGPU_RUNTIME_ERROR_MESSAGE,
      "Chromeの完全再起動、ChatGPT側のタブ再読み込み、通常ウィンドウでの再試行を確認してください。",
      "runtime"
    )
  },
  worker: signal(
    "worker",
    WORKER_ERROR_MESSAGE,
    "WebLLMの内部WorkerまたはGPUオブジェクトが破棄済みになっています。ページを再読み込みしてから再試行してください。"
  ),
  wasm: signal("wasm", WASM_ERROR_MESSAGE, "Chromeのサイトデータ削除後、WASMファイルを再取得してから再試行してください。"),
  json_parse: signal("json_parse", JSON_PARSE_ERROR_MESSAGE, "ルールベース検出結果は維持されています。必要なら再実行してください。"),
  unknown: signal(
    "unknown",
    GENERIC_LLM_ERROR_MESSAGE,
    "DevTools Consoleの赤いエラー、Networkタブの失敗リクエスト、chrome://gpu のDawn Infoを確認してください。"
  )
} as const;

function containsAny(message: string, patterns: string[]): boolean {
  return patterns.some((pattern) => message.includes(pattern));
}

function isWebGpuRuntimeFailure(message: string): boolean {
  return containsAny(message, ["gpubuffer", "mapasync", "unmapped before mapping"]);
}

function isWebGpuAdapterUnavailable(message: string): boolean {
  return containsAny(message, [
    "no available adapters",
    "no available webgpu adapters",
    "gpuadapter",
    "requestadapter",
    "navigator.gpu"
  ]);
}

const rules: LlmErrorRule[] = [
  {
    id: "model_fetch",
    match: (message) =>
      containsAny(message, [
        "err_network_access_denied",
        "failed to fetch",
        "networkerror",
        "load failed",
        "huggingface.co",
        "raw.githubusercontent.com",
        "cors",
        "status code 401",
        "status code 403",
        "status code 404"
      ]) || (message.includes("model") && message.includes("fetch")),
    copy: () => errorCopies.model_fetch
  },
  {
    id: "storage",
    match: (message) => containsAny(message, ["quota", "indexeddb", "cache", "storage", "disk", "not enough space"]),
    copy: () => errorCopies.storage
  },
  {
    id: "memory",
    match: (message) =>
      containsAny(message, ["out of memory", "memory access out of bounds", "allocation", "vram", "gpu memory"]),
    copy: () => errorCopies.memory
  },
  {
    id: "webgpu",
    match: (message) =>
      containsAny(message, [
        "webgpu",
        "gpubuffer",
        "mapasync",
        "unmapped before mapping",
        "gpuadapter",
        "requestadapter",
        "requestdevice",
        "navigator.gpu",
        "no available adapters",
        "device lost"
      ]),
    copy: (message) => {
      if (isWebGpuRuntimeFailure(message)) {
        return errorCopies.webgpu.runtime;
      }

      if (isWebGpuAdapterUnavailable(message)) {
        return errorCopies.webgpu.adapter_unavailable;
      }

      return errorCopies.webgpu.default;
    }
  },
  {
    id: "worker",
    match: (message) =>
      containsAny(message, [
        "worker",
        "module script",
        "failed to construct",
        "imported module",
        "already been disposed",
        "disposed object"
      ]),
    copy: () => errorCopies.worker
  },
  {
    id: "wasm",
    match: (message) => containsAny(message, ["wasm", "webassembly", "compile", "instantiate"]),
    copy: () => errorCopies.wasm
  },
  {
    id: "json_parse",
    match: (_message, originalMessage) => isJsonParseLlmErrorMessage(originalMessage),
    copy: () => errorCopies.json_parse
  }
];

export function isJsonParseLlmErrorMessage(message: string | undefined): boolean {
  if (!message) {
    return false;
  }

  const lowerMessage = message.toLowerCase();
  const normalizedMessage = message.replace(/\s+/g, "");
  const isJapaneseReadFailure =
    normalizedMessage.includes("読み取れ") &&
    (normalizedMessage.includes("AI文脈チェック") || normalizedMessage.includes("出力形式"));

  return (
    message.includes("AI文脈チェックの結果を読み取れませんでした") ||
    message.includes("AI文脈チェックの出力形式を読み取れませんでした") ||
    lowerMessage.includes("json") ||
    isJapaneseReadFailure
  );
}

export function getLlmErrorSignalCopy(kind: LlmErrorDetail["kind"], variant?: LlmErrorVariant): LlmErrorSignal {
  if (kind === "webgpu") {
    if (variant === "adapter_unavailable") {
      return errorCopies.webgpu.adapter_unavailable;
    }

    if (variant === "runtime") {
      return errorCopies.webgpu.runtime;
    }

    return errorCopies.webgpu.default;
  }

  return errorCopies[kind] ?? errorCopies.unknown;
}

export function classifyLlmErrorSignal(message: string): LlmErrorSignal {
  const lowerMessage = message.toLowerCase();
  const matchedRule = rules.find((rule) => rule.match(lowerMessage, message));
  return matchedRule?.copy(lowerMessage) ?? errorCopies.unknown;
}

export function createJsonParseFallbackMessage(candidateCount: number): string {
  return candidateCount > 0 ? JSON_PARSE_RESIDUAL_FALLBACK_MESSAGE : JSON_PARSE_RULE_BASED_FALLBACK_MESSAGE;
}
