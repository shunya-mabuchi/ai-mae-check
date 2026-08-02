import type { AnalyzeContextOptions, LlmExecutionProfileId } from "@ai-mae-check/llm";
import type { LlmBridgeRequest } from "./llmBridgeMessages";

export interface CreateLlmBridgeAnalyzeRequestOptions
  extends Pick<AnalyzeContextOptions, "existingFindings" | "maxCandidates"> {
  requestId: string;
  inputText: string;
  modelId: string;
  profileId: LlmExecutionProfileId;
}

export type LlmBridgeAnalyzeRequest = Extract<LlmBridgeRequest, { type: "analyze" }>;
export type LlmBridgeModelStateRequest = Extract<LlmBridgeRequest, { type: "model-state" }>;

export function createLlmBridgeAnalyzeRequest(options: CreateLlmBridgeAnalyzeRequestOptions): LlmBridgeAnalyzeRequest {
  return {
    type: "analyze",
    requestId: options.requestId,
    inputText: options.inputText,
    modelId: options.modelId,
    profileId: options.profileId,
    options: {
      ...(options.existingFindings ? { existingFindings: options.existingFindings } : {}),
      ...(typeof options.maxCandidates === "number" ? { maxCandidates: options.maxCandidates } : {})
    }
  };
}

export function createLlmBridgeModelStateRequest(
  requestId: string,
  modelId: string,
  profileId: LlmExecutionProfileId
): LlmBridgeModelStateRequest {
  return {
    type: "model-state",
    requestId,
    modelId,
    profileId,
    options: {}
  };
}
