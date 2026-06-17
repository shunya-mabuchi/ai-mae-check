import type {
  AnalyzeContextOptions,
  ContextAnalysisResult,
  LlmProgress
} from "@ai-mae-check/llm";

export const LLM_BRIDGE_CONNECT = "ai-mae-check:llm-bridge-connect";
export const LLM_BRIDGE_READY = "ai-mae-check:llm-bridge-ready";

export type LlmBridgeRequest =
  {
    type: "analyze";
    requestId: string;
    inputText: string;
    modelId: string;
    options: Pick<AnalyzeContextOptions, "existingFindings" | "maxCandidates">;
  };

export type LlmBridgeResponse =
  | {
      type: "ready";
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
      type: "error";
      requestId: string;
      message: string;
    };
