import {
  createJsonParseFallbackMessage,
  MODEL_LOADING_MESSAGE,
  WEBGPU_UNAVAILABLE_MESSAGE,
  type LlmErrorDetail,
  type LlmProgress
} from "@ai-mae-check/llm";
import { initialLlmMessage, type LlmStatus } from "./demoConstants";

export interface DemoLlmUiState {
  status: LlmStatus;
  message: string;
  errorDetail: LlmErrorDetail | null;
}

export function createIdleLlmUiState(): DemoLlmUiState {
  return {
    status: "idle",
    message: initialLlmMessage,
    errorDetail: null
  };
}

export function createEmptyInputLlmUiState(): DemoLlmUiState {
  return {
    status: "error",
    message: "先に送信前テキストを入力してください。",
    errorDetail: null
  };
}

export function createWebGpuUnavailableLlmUiState(): DemoLlmUiState {
  return {
    status: "error",
    message: WEBGPU_UNAVAILABLE_MESSAGE,
    errorDetail: {
      kind: "webgpu",
      message: WEBGPU_UNAVAILABLE_MESSAGE,
      hint: "chrome://gpu のDawn InfoでD3D12 backendがAvailableか確認してください。"
    }
  };
}

export function createLoadingLlmUiState(): DemoLlmUiState {
  return {
    status: "loading",
    message: MODEL_LOADING_MESSAGE,
    errorDetail: null
  };
}

export function createProgressLlmUiState(progress: LlmProgress): DemoLlmUiState {
  return {
    status: progress.phase === "analyzing" ? "analyzing" : "loading",
    message: progress.message,
    errorDetail: null
  };
}

export function createLlmCompleteUiState(candidateCount: number): DemoLlmUiState {
  if (candidateCount > 0) {
    return {
      status: "done",
      message: "AI文脈チェックで注意候補が見つかりました。",
      errorDetail: null
    };
  }

  return {
    status: "empty",
    message: "AI文脈チェックでは追加の注意候補は見つかりませんでした。ただし、安全を保証するものではありません。",
    errorDetail: null
  };
}

export function createLlmResultUiState(candidateCount: number, detail?: LlmErrorDetail): DemoLlmUiState {
  if (detail?.kind === "json_parse") {
    return {
      status: candidateCount > 0 ? "done" : "empty",
      message: createJsonParseFallbackMessage(candidateCount),
      errorDetail: null
    };
  }

  return createLlmCompleteUiState(candidateCount);
}

export function createErrorLlmUiState(errorDetail: LlmErrorDetail): DemoLlmUiState {
  return {
    status: "error",
    message: errorDetail.message,
    errorDetail
  };
}
