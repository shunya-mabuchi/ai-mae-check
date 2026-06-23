import { DEFAULT_MODEL_ID } from "./constants";
import { createLlmContextAnalyzer } from "./analyzer";
import {
  classifyLlmError,
  createLlmErrorDetailError,
  isContextAnalysisExecutionError,
  sanitizeLlmErrorDetail
} from "./errors";
import type {
  ContextAnalysisResult,
  ContextAnalyzeRequest,
  ContextCheckPlan,
  LlmAnalyzerOptions,
  LlmContextAnalyzer,
  LlmErrorDetail,
  LlmProgress,
  LlmRuntimeStatus,
  LocalLlmRuntimeService
} from "./types";

const RUNTIME_IDLE_MESSAGE = "AI文脈チェックは未準備です。";
const RUNTIME_READY_MESSAGE = "AI文脈チェックを実行できます。";
const RUNTIME_DISPOSED_MESSAGE = "AI文脈チェックを終了しました。";
const RUNTIME_PREPARING_MESSAGE =
  "ローカルAIモデルを準備しています。初回のみ時間がかかる場合があります。";
const RUNTIME_ANALYZING_MESSAGE = "文脈リスクを確認しています。";
const RUNTIME_EXECUTION_ERROR_MESSAGE = "AI文脈チェックを実行できませんでした。";

interface LocalLlmRuntimeServiceOptions extends LlmAnalyzerOptions {
  analyzer?: LlmContextAnalyzer;
}

function createStatus(status: LlmRuntimeStatus): LlmRuntimeStatus {
  return { ...status };
}

function createErrorStatus(modelId: string, errorDetail: LlmErrorDetail, sourceText?: string): LlmRuntimeStatus {
  const safeErrorDetail = sanitizeLlmErrorDetail(errorDetail, sourceText);
  return {
    phase: "error",
    ready: false,
    modelId,
    message: safeErrorDetail.message,
    errorDetail: safeErrorDetail
  };
}

function createProgressStatus(modelId: string, progress: LlmProgress, ready: boolean): LlmRuntimeStatus {
  return {
    phase: progress.phase === "analyzing" ? "analyzing" : "preparing",
    ready,
    modelId,
    message: progress.message
  };
}

export function createLocalLlmRuntimeService(
  options: LocalLlmRuntimeServiceOptions = {}
): LocalLlmRuntimeService {
  const modelId = options.modelId ?? DEFAULT_MODEL_ID;
  const analyzer = options.analyzer ?? createLlmContextAnalyzer(options);
  let currentStatus: LlmRuntimeStatus = {
    phase: "idle",
    ready: analyzer.isReady(),
    modelId,
    message: analyzer.isReady() ? RUNTIME_READY_MESSAGE : RUNTIME_IDLE_MESSAGE
  };

  function setReady(): void {
    currentStatus = {
      phase: "ready",
      ready: analyzer.isReady(),
      modelId,
      message: RUNTIME_READY_MESSAGE
    };
  }

  function setError(error: unknown, sourceText?: string): LlmErrorDetail {
    const errorDetail = classifyLlmError(error);
    const safeErrorDetail = sanitizeLlmErrorDetail(errorDetail, sourceText);
    currentStatus = createErrorStatus(modelId, safeErrorDetail, sourceText);
    return safeErrorDetail;
  }

  function wrapProgress(onProgress?: (progress: LlmProgress) => void): (progress: LlmProgress) => void {
    return (progress) => {
      currentStatus = createProgressStatus(modelId, progress, analyzer.isReady());
      onProgress?.(progress);
    };
  }

  return {
    status(): LlmRuntimeStatus {
      return createStatus(currentStatus);
    },

    async prepare(plan?: ContextCheckPlan): Promise<void> {
      void plan;
      if (analyzer.isReady()) {
        setReady();
        return;
      }

      currentStatus = {
        phase: "preparing",
        ready: false,
        modelId,
        message: RUNTIME_PREPARING_MESSAGE
      };

      try {
        await analyzer.prepare(wrapProgress());
        setReady();
      } catch (error) {
        const safeErrorDetail = setError(error);
        throw createLlmErrorDetailError(safeErrorDetail);
      }
    },

    async analyze(request: ContextAnalyzeRequest): Promise<ContextAnalysisResult> {
      currentStatus = {
        phase: "analyzing",
        ready: analyzer.isReady(),
        modelId,
        message: RUNTIME_ANALYZING_MESSAGE
      };

      try {
        const { input, onProgress, ...analyzeOptions } = request;
        const result = await analyzer.analyze(input, {
          ...analyzeOptions,
          onProgress: wrapProgress(onProgress)
        });
        const safeResult = result.errorDetail
          ? {
              ...result,
              errorDetail: sanitizeLlmErrorDetail(result.errorDetail, input)
            }
          : result;

        if (isContextAnalysisExecutionError(safeResult)) {
          currentStatus = createErrorStatus(
            modelId,
            safeResult.errorDetail ?? classifyLlmError(safeResult.error ?? RUNTIME_EXECUTION_ERROR_MESSAGE),
            input
          );
          return safeResult;
        }

        setReady();
        return safeResult;
      } catch (error) {
        const safeErrorDetail = setError(error, request.input);
        throw createLlmErrorDetailError(safeErrorDetail);
      }
    },

    async dispose(): Promise<void> {
      await analyzer.dispose();
      currentStatus = {
        phase: "disposed",
        ready: false,
        modelId,
        message: RUNTIME_DISPOSED_MESSAGE
      };
    }
  };
}
