import type {
  AnalyzeContextOptions,
  ContextAnalysisResult,
  LlmProgress
} from "@ai-mae-check/llm";

export const LLM_BRIDGE_CONNECT = "ai-mae-check:llm-bridge-connect";
export const LLM_BRIDGE_READY = "ready";
export const LLM_BRIDGE_NONCE_QUERY_PARAM = "nonce";

export interface LlmBridgeConnectMessage {
  type: typeof LLM_BRIDGE_CONNECT;
  nonce: string;
}

export type LlmBridgeRequest =
  | {
      type: "analyze";
      requestId: string;
      inputText: string;
      modelId: string;
      options: Pick<AnalyzeContextOptions, "existingFindings" | "maxCandidates">;
    }
  | {
      type: "model-state";
      requestId: string;
      modelId: string;
      options: Record<string, never>;
    };

export type LlmBridgeResponse =
  | {
      type: typeof LLM_BRIDGE_READY;
    }
  | {
      type: "progress";
      requestId: string;
      progress: LlmProgress;
    }
  | {
      type: "analyze-result";
      requestId: string;
      result: ContextAnalysisResult;
    }
  | {
      type: "model-state-result";
      requestId: string;
      ready: boolean;
    }
  | {
      type: "error";
      requestId: string;
      message: string;
    };

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function createLlmBridgeConnectMessage(nonce: string): LlmBridgeConnectMessage {
  return {
    type: LLM_BRIDGE_CONNECT,
    nonce
  };
}

export function getLlmBridgeExpectedNonce(locationHref: string): string | null {
  let nonce: string | null = null;

  try {
    nonce = new URL(locationHref).searchParams.get(LLM_BRIDGE_NONCE_QUERY_PARAM);
  } catch {
    return null;
  }

  return typeof nonce === "string" && nonce.length > 0 ? nonce : null;
}

export function isLlmBridgeConnectMessage(value: unknown): value is LlmBridgeConnectMessage {
  return (
    isObjectRecord(value) &&
    value.type === LLM_BRIDGE_CONNECT &&
    typeof value.nonce === "string" &&
    value.nonce.length > 0
  );
}

export function shouldAcceptLlmBridgeConnection(options: {
  expectedNonce: string | null;
  isConnected: boolean;
  message: unknown;
  portCount: number;
}): options is { expectedNonce: string; isConnected: false; message: LlmBridgeConnectMessage; portCount: number } {
  return (
    !options.isConnected &&
    options.expectedNonce !== null &&
    options.portCount > 0 &&
    isLlmBridgeConnectMessage(options.message) &&
    options.message.nonce === options.expectedNonce
  );
}

export function getLlmBridgeRequestId(value: unknown): string | null {
  if (!isObjectRecord(value) || typeof value.requestId !== "string" || value.requestId.length === 0) {
    return null;
  }

  return value.requestId;
}

export function isLlmBridgeRequest(value: unknown): value is LlmBridgeRequest {
  if (!isObjectRecord(value)) {
    return false;
  }

  if (value.type !== "analyze" && value.type !== "model-state") {
    return false;
  }

  if (typeof value.requestId !== "string" || typeof value.modelId !== "string" || !isObjectRecord(value.options)) {
    return false;
  }

  if (value.type === "model-state") {
    return true;
  }

  if (typeof value.inputText !== "string") {
    return false;
  }

  const existingFindings = value.options.existingFindings;
  const maxCandidates = value.options.maxCandidates;

  return (
    (existingFindings === undefined || Array.isArray(existingFindings)) &&
    (maxCandidates === undefined || typeof maxCandidates === "number")
  );
}
