import { WEBGPU_UNAVAILABLE_MESSAGE } from "./constants";
import type { LlmErrorDetail } from "./types";

const RULE_BASED_CONTINUES = "ルールベースの検出結果は引き続き利用できます。";
const RULE_BASED_DETECTION_CONTINUES = "ルールベースの検出は引き続き利用できます。";

const GENERIC_LLM_ERROR_MESSAGE = `AI文脈チェックを実行できませんでした。${RULE_BASED_CONTINUES}`;

const MODEL_FETCH_ERROR_MESSAGE = `ローカルAIモデルの取得に失敗しました。モデル配信元への接続がブロックされている可能性があります。${RULE_BASED_CONTINUES}`;

const JSON_PARSE_ERROR_MESSAGE = `AI文脈チェックの結果を読み取れませんでした。${RULE_BASED_CONTINUES}`;
const JSON_PARSE_RULE_BASED_FALLBACK_MESSAGE =
  "ルールベース検出結果で安全化できます。AI文脈チェックは必要に応じて再実行してください。";
const JSON_PARSE_RESIDUAL_FALLBACK_MESSAGE =
  "ブラウザ内の補助検出で注意候補を確認しました。安全化対象を選んで続行できます。";

const STORAGE_ERROR_MESSAGE = `ローカルAIモデルの保存領域を確保できませんでした。ブラウザのサイトデータや空き容量を確認してください。${RULE_BASED_CONTINUES}`;

const MEMORY_ERROR_MESSAGE = `ローカルAIモデルの実行に必要なメモリを確保できませんでした。ほかのタブやアプリを閉じてから再試行してください。${RULE_BASED_CONTINUES}`;

const WEBGPU_ADAPTER_UNAVAILABLE_MESSAGE = `WebGPUアダプタを取得できませんでした。このブラウザまたは端末ではAI文脈チェックを利用できません。${RULE_BASED_DETECTION_CONTINUES}`;

const WEBGPU_RUNTIME_ERROR_MESSAGE = `ローカルAIモデルのGPU実行が中断されました。${RULE_BASED_CONTINUES}`;

const WORKER_ERROR_MESSAGE = `AI文脈チェック用のWorkerを起動できませんでした。ページを再読み込みしてから再試行してください。${RULE_BASED_CONTINUES}`;

const WASM_ERROR_MESSAGE = `AI文脈チェック用の実行ファイルを読み込めませんでした。ブラウザのサイトデータを削除してから再試行してください。${RULE_BASED_CONTINUES}`;

const TIMEOUT_ERROR_MESSAGE = `AI文脈チェックが時間内に完了しませんでした。${RULE_BASED_CONTINUES}`;

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
    "Hugging FaceやGitHub rawへのアクセス、プロキシ、セキュリティソフト、広告ブロッカー、社内ネットワーク制限を確認してください。"
  ),
  storage: signal(
    "storage",
    STORAGE_ERROR_MESSAGE,
    "Chrome DevToolsのApplication > Storageから対象サイトのサイトデータを削除し、ディスク空き容量も確認してください。シークレットモードでは保存容量が制限される場合があります。"
  ),
  memory: signal(
    "memory",
    MEMORY_ERROR_MESSAGE,
    "ほかのタブやアプリを閉じ、通常ウィンドウで再試行してください。低VRAM環境ではWebLLMが利用できない場合があります。"
  ),
  webgpu: {
    default: signal(
      "webgpu",
      WEBGPU_UNAVAILABLE_MESSAGE,
      "chrome://gpu のDawn InfoでWebGPU StatusやD3D12 backendを確認してください。Chromeの完全再起動も有効です。"
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
      "Chromeの完全再起動、対象タブの再読み込み、通常ウィンドウでの再試行を確認してください。",
      "runtime"
    )
  },
  worker: signal(
    "worker",
    WORKER_ERROR_MESSAGE,
    "拡張機能を再読み込みした場合は、ChatGPT / Claude / Gemini側のタブも再読み込みしてください。"
  ),
  wasm: signal("wasm", WASM_ERROR_MESSAGE, "ブラウザキャッシュやサイトデータを削除してから再試行してください。"),
  json_parse: signal("json_parse", JSON_PARSE_ERROR_MESSAGE, "ルールベース検出結果は維持されています。必要なら再実行してください。"),
  timeout: signal(
    "timeout",
    TIMEOUT_ERROR_MESSAGE,
    "入力を短くする、対象タブを再読み込みする、初回モデル準備が終わってから再試行する、の順に確認してください。"
  ),
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
  return containsAny(message, ["gpubuffer", "mapasync", "unmapped before mapping", "device lost"]);
}

function isWebGpuAdapterUnavailable(message: string): boolean {
  return containsAny(message, [
    "no available adapters",
    "no available webgpu adapters",
    "unable to find a compatible gpu",
    "doesn't have a gpu",
    "does not have a gpu",
    "browser supports webgpu",
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
        "unable to find a compatible gpu",
        "browser supports webgpu",
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
  },
  {
    id: "timeout",
    match: (message) =>
      containsAny(message, [
        "aborterror",
        "aborted",
        "timeout",
        "timed out",
        "signal is aborted",
        "応答しませんでした",
        "時間内に完了"
      ]),
    copy: () => errorCopies.timeout
  }
];

export function isJsonParseLlmErrorMessage(message: string | undefined): boolean {
  if (!message) {
    return false;
  }

  const lowerMessage = message.toLowerCase();
  const normalizedMessage = message.replace(/\s+/g, "");

  return (
    normalizedMessage.includes("AI文脈チェックの結果を読み取れませんでした") ||
    normalizedMessage.includes("AI文脈チェックの出力形式を読み取れませんでした") ||
    normalizedMessage.includes("AI文脈チェックの出力形式は読み取れませんでした") ||
    lowerMessage.includes("json")
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
