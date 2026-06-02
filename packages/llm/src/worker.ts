import { ANALYZING_MESSAGE, DEFAULT_MODEL_ID, MODEL_LOADING_MESSAGE } from "./constants";
import { formatLlmErrorMessage } from "./errors";
import { buildContextRiskPrompt } from "./prompt";
import { parseContextAnalysisJson } from "./parser";
import type { AnalyzeContextOptions, ContextAnalysisResult, LlmAnalyzerOptions, LlmProgress } from "./types";

type WebLlmProgressReport = {
  progress?: number;
  text?: string;
};

type WebLlmChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type WebLlmCompletion = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

type WebLlmEngine = {
  chat: {
    completions: {
      create(request: {
        messages: WebLlmChatMessage[];
        temperature: number;
        max_tokens: number;
      }): Promise<WebLlmCompletion>;
    };
  };
  unload?(): Promise<void> | void;
};

type WebLlmModule = {
  CreateMLCEngine(
    modelId: string,
    options?: {
      initProgressCallback?: (report: WebLlmProgressReport) => void;
    }
  ): Promise<WebLlmEngine>;
  prebuiltAppConfig?: {
    model_list?: Array<{
      model_id?: string;
      model?: string;
    }>;
  };
};

type WorkerAnalyzeRequest = {
  type: "analyze";
  requestId: string;
  input: string;
  analyzerOptions: Required<Omit<LlmAnalyzerOptions, "workerUrl">>;
  analyzeOptions: Pick<AnalyzeContextOptions, "existingFindings" | "language" | "maxCandidates">;
};

type WorkerScope = {
  postMessage(message: unknown): void;
  addEventListener(type: "message", listener: (event: MessageEvent<unknown>) => void): void;
};

const workerScope = globalThis as unknown as WorkerScope;

let engine: WebLlmEngine | null = null;
let loadedModelId: string | null = null;

function postProgress(requestId: string, progress: LlmProgress): void {
  workerScope.postMessage({ type: "progress", requestId, progress });
}

function resolveModelId(module: WebLlmModule, requestedModelId: string): string {
  const modelList = module.prebuiltAppConfig?.model_list ?? [];
  const ids = modelList.map((item) => item.model_id ?? item.model).filter((id): id is string => typeof id === "string");

  if (ids.includes(requestedModelId)) {
    return requestedModelId;
  }

  if (ids.includes(DEFAULT_MODEL_ID)) {
    return DEFAULT_MODEL_ID;
  }

  const lightweight = ids.find((id) => /1B/i.test(id) && /Instruct/i.test(id));
  if (lightweight) {
    return lightweight;
  }

  return ids.find((id) => /Instruct/i.test(id)) ?? requestedModelId;
}

async function getEngine(requestId: string, options: Required<Omit<LlmAnalyzerOptions, "workerUrl">>): Promise<{ engine: WebLlmEngine; modelId: string }> {
  const webllm = (await import("@mlc-ai/web-llm")) as unknown as WebLlmModule;
  const modelId = resolveModelId(webllm, options.modelId);

  if (engine && loadedModelId === modelId) {
    return { engine, modelId };
  }

  if (engine) {
    await engine.unload?.();
  }

  postProgress(requestId, {
    phase: "loading",
    message: MODEL_LOADING_MESSAGE
  });

  engine = await webllm.CreateMLCEngine(modelId, {
    initProgressCallback: (report) => {
      const progress: LlmProgress = {
        phase: "loading",
        message: report.text && report.text.length > 0 ? report.text : MODEL_LOADING_MESSAGE
      };

      if (typeof report.progress === "number") {
        progress.progress = report.progress;
      }

      postProgress(requestId, progress);
    }
  });
  loadedModelId = modelId;

  return { engine, modelId };
}

async function analyze(request: WorkerAnalyzeRequest): Promise<ContextAnalysisResult> {
  const startedAt = performance.now();
  const { engine: currentEngine, modelId } = await getEngine(request.requestId, request.analyzerOptions);
  const promptOptions = {
    existingFindings: request.analyzeOptions.existingFindings ?? [],
    ...(typeof request.analyzeOptions.maxCandidates === "number"
      ? { maxCandidates: request.analyzeOptions.maxCandidates }
      : {})
  };
  const messages = buildContextRiskPrompt(request.input, promptOptions);

  postProgress(request.requestId, {
    phase: "analyzing",
    message: ANALYZING_MESSAGE
  });

  const completion = await currentEngine.chat.completions.create({
    messages,
    temperature: request.analyzerOptions.temperature,
    max_tokens: request.analyzerOptions.maxTokens
  });
  const rawText = completion.choices?.[0]?.message?.content ?? "";
  const parsed = parseContextAnalysisJson(rawText, {
    ...(typeof request.analyzeOptions.maxCandidates === "number"
      ? { maxCandidates: request.analyzeOptions.maxCandidates }
      : {}),
    confidenceThreshold: request.analyzerOptions.confidenceThreshold
  });

  return {
    candidates: parsed.candidates,
    summary: parsed.summary,
    rawText,
    modelId,
    elapsedMs: Math.max(0, performance.now() - startedAt)
  };
}

workerScope.addEventListener("message", (event: MessageEvent<unknown>) => {
  const data = event.data;
  if (typeof data !== "object" || data === null) {
    return;
  }

  const record = data as Record<string, unknown>;
  if (record.type !== "analyze" || typeof record.requestId !== "string") {
    return;
  }

  const request = data as WorkerAnalyzeRequest;
  analyze(request)
    .then((result) => {
      workerScope.postMessage({ type: "result", requestId: request.requestId, result });
    })
    .catch((error: unknown) => {
      workerScope.postMessage({
        type: "error",
        requestId: request.requestId,
        error: formatLlmErrorMessage(error),
        modelId: request.analyzerOptions.modelId,
        elapsedMs: 0
      });
    });
});
