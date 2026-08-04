import type { LlmErrorDetail } from "./types";

const RULES_CONTINUE = "ルールベースの検出結果は引き続き利用できます。";

export type LlmErrorSignal = Pick<LlmErrorDetail, "kind" | "message" | "hint">;

function signal(kind: LlmErrorDetail["kind"], message: string, hint: string): LlmErrorSignal {
  return { kind, message, hint };
}

const errorCopies: Record<LlmErrorDetail["kind"], LlmErrorSignal> = {
  model_configuration: signal(
    "model_configuration",
    `ブラウザ内AIモデルの実行設定に互換性がありません。${RULES_CONTINUE}`,
    "拡張機能を最新版へ更新し、対象タブを再読み込みしてから再試行してください。"
  ),
  model_fetch: signal(
    "model_fetch",
    `ブラウザ内AIモデルの取得に失敗しました。モデル配信元への接続がブロックされている可能性があります。${RULES_CONTINUE}`,
    "Hugging Faceへのアクセス、プロキシ、セキュリティソフト、広告ブロッカー、社内ネットワーク制限を確認してください。"
  ),
  storage: signal(
    "storage",
    `ブラウザ内AIモデルの保存領域を確保できませんでした。ブラウザのサイトデータや空き容量を確認してください。${RULES_CONTINUE}`,
    "Chrome DevToolsのApplication > Storageから対象サイトのサイトデータを削除し、ディスク空き容量も確認してください。シークレットモードでは保存容量が制限される場合があります。"
  ),
  memory: signal(
    "memory",
    `ブラウザ内AIモデルの実行に必要なメモリを確保できませんでした。ほかのタブやアプリを閉じてから再試行してください。${RULES_CONTINUE}`,
    "ほかのタブやアプリを閉じ、通常ウィンドウで再試行してください。"
  ),
  worker: signal(
    "worker",
    `AI文脈チェック用のWorkerを起動できませんでした。ページを再読み込みしてから再試行してください。${RULES_CONTINUE}`,
    "拡張機能を再読み込みした場合は、対象サイトのタブも再読み込みしてください。"
  ),
  wasm: signal(
    "wasm",
    `AI文脈チェック用のWebAssembly実行環境を利用できませんでした。${RULES_CONTINUE}`,
    "ブラウザキャッシュやサイトデータを削除し、通常ウィンドウで再試行してください。"
  ),
  timeout: signal(
    "timeout",
    `AI文脈チェックが時間内に完了しませんでした。${RULES_CONTINUE}`,
    "入力を短くする、対象タブを再読み込みする、初回モデル準備が終わってから再試行する、の順に確認してください。"
  ),
  unknown: signal(
    "unknown",
    `AI文脈チェックを実行できませんでした。${RULES_CONTINUE}`,
    "DevTools Consoleの赤いエラーとNetworkタブの失敗リクエストを確認してください。"
  )
};

function containsAny(message: string, patterns: string[]): boolean {
  return patterns.some((pattern) => message.includes(pattern));
}

export function getLlmErrorSignalCopy(kind: LlmErrorDetail["kind"]): LlmErrorSignal {
  return errorCopies[kind] ?? errorCopies.unknown;
}

export function classifyLlmErrorSignal(message: string): LlmErrorSignal {
  const normalized = message.toLowerCase();

  if (containsAny(normalized, ["configurationerror", "incompatible", "unsupported model type"])) {
    return errorCopies.model_configuration;
  }
  if (
    containsAny(normalized, [
      "err_network_access_denied",
      "failed to fetch",
      "networkerror",
      "load failed",
      "huggingface.co",
      "cors",
      "status code 401",
      "status code 403",
      "status code 404"
    ]) || (normalized.includes("model") && normalized.includes("fetch"))
  ) {
    return errorCopies.model_fetch;
  }
  if (containsAny(normalized, ["quota", "indexeddb", "cache", "storage", "disk", "not enough space"])) {
    return errorCopies.storage;
  }
  if (containsAny(normalized, ["out of memory", "insufficient memory", "memory access out of bounds", "allocation"])) {
    return errorCopies.memory;
  }
  if (containsAny(normalized, ["worker", "module script", "failed to construct", "imported module"])) {
    return errorCopies.worker;
  }
  if (
    containsAny(normalized, [
      "wasm",
      "webassembly",
      "compile",
      "instantiate",
      "no available backend",
      "object has already been disposed",
      "disposed object"
    ])
  ) {
    return errorCopies.wasm;
  }
  if (
    containsAny(normalized, [
      "aborterror",
      "aborted",
      "timeout",
      "timed out",
      "signal is aborted",
      "応答しませんでした",
      "時間内に完了"
    ])
  ) {
    return errorCopies.timeout;
  }

  return errorCopies.unknown;
}
