import type { AnalyzeContextOptions } from "@ai-mae-check/llm";
import type { LlmBridgeRequest } from "./llmBridgeMessages";

export interface CreateLlmBridgeAnalyzeRequestOptions
  extends Pick<AnalyzeContextOptions, "existingFindings" | "maxCandidates"> {
  requestId: string;
  inputText: string;
  modelId: string;
}

export type LlmBridgeAnalyzeRequest = Extract<LlmBridgeRequest, { type: "analyze" }>;
export type LlmBridgeModelStateRequest = Extract<LlmBridgeRequest, { type: "model-state" }>;

export function createLlmBridgeAnalyzeRequest(options: CreateLlmBridgeAnalyzeRequestOptions): LlmBridgeAnalyzeRequest {
  return {
    type: "analyze",
    requestId: options.requestId,
    inputText: options.inputText,
    modelId: options.modelId,
    options: {
      ...(options.existingFindings ? { existingFindings: options.existingFindings } : {}),
      ...(typeof options.maxCandidates === "number" ? { maxCandidates: options.maxCandidates } : {})
    }
  };
}

export function createLlmBridgeModelStateRequest(requestId: string, modelId: string): LlmBridgeModelStateRequest {
  return {
    type: "model-state",
    requestId,
    modelId,
    options: {}
  };
}
