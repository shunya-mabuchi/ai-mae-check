import {
  createContextAnalysisCompleteMessage,
  createContextAnalysisResultMessage,
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

export type LlmStatusPanelIcon = "check" | "alert";

export interface LlmStatusPanelViewModel {
  icon: LlmStatusPanelIcon;
  className: string;
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
  return {
    status: candidateCount > 0 ? "done" : "empty",
    message: createContextAnalysisCompleteMessage(candidateCount),
    errorDetail: null
  };
}

export function createLlmResultUiState(candidateCount: number, detail?: LlmErrorDetail): DemoLlmUiState {
  if (detail?.kind === "json_parse") {
    return {
      status: candidateCount > 0 ? "done" : "empty",
      message: createContextAnalysisResultMessage({ candidateCount, errorDetail: detail }),
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

export function createLlmStatusPanelViewModel(status: LlmStatus): LlmStatusPanelViewModel {
  const baseClassName = "rounded-card border p-3 text-sm";

  if (status === "error") {
    return {
      icon: "alert",
      className: `${baseClassName} border-rose-200 bg-rose-50 text-rose-800`
    };
  }

  if (status === "done") {
    return {
      icon: "check",
      className: `${baseClassName} border-leaf/30 bg-emerald-50 text-emerald-900`
    };
  }

  return {
    icon: "alert",
    className: `${baseClassName} border-line bg-white text-muted`
  };
}
