import { WEBGPU_UNAVAILABLE_MESSAGE } from "./constants";

const GENERIC_LLM_ERROR_MESSAGE =
  "AI文脈チェックを実行できませんでした。ルールベースの検出結果は引き続き利用できます。";

const MODEL_FETCH_ERROR_MESSAGE =
  "ローカルAIモデルの取得に失敗しました。モデル配信元への接続がブロックされている可能性があります。ルールベースの検出結果は引き続き利用できます。";

const JSON_PARSE_ERROR_MESSAGE =
  "AI文脈チェックの結果を読み取れませんでした。ルールベースの検出結果は引き続き利用できます。";

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return typeof error === "string" ? error : "";
}

export function formatLlmErrorMessage(error: unknown): string {
  const message = errorMessage(error);
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes("err_network_access_denied") ||
    lowerMessage.includes("failed to fetch") ||
    lowerMessage.includes("networkerror") ||
    lowerMessage.includes("huggingface.co") ||
    lowerMessage.includes("model") && lowerMessage.includes("fetch")
  ) {
    return MODEL_FETCH_ERROR_MESSAGE;
  }

  if (lowerMessage.includes("webgpu") || lowerMessage.includes("gpuadapter") || lowerMessage.includes("navigator.gpu")) {
    return WEBGPU_UNAVAILABLE_MESSAGE;
  }

  if (message.includes("AI文脈チェックの結果を読み取れませんでした")) {
    return JSON_PARSE_ERROR_MESSAGE;
  }

  return GENERIC_LLM_ERROR_MESSAGE;
}
