import {
  DEFAULT_CONTEXT_WINDOW_SIZE,
  DEFAULT_MAX_CANDIDATES,
  DEFAULT_MAX_INPUT_CHARS,
  DEFAULT_MODEL_ID
} from "./constants";
import type { LlmExecutionProfile, LlmExecutionProfileId } from "./types";

const STANDARD_PROFILE: LlmExecutionProfile = {
  id: "standard",
  modelId: DEFAULT_MODEL_ID,
  contextWindowSize: DEFAULT_CONTEXT_WINDOW_SIZE,
  maxInputChars: DEFAULT_MAX_INPUT_CHARS,
  maxTokens: 900,
  maxCandidates: DEFAULT_MAX_CANDIDATES,
  compactPrompt: false
};

const LOW_RESOURCE_PROFILE: LlmExecutionProfile = {
  id: "low_resource",
  modelId: DEFAULT_MODEL_ID,
  contextWindowSize: 2048,
  maxInputChars: 800,
  maxTokens: 256,
  maxCandidates: 6,
  compactPrompt: true
};

export function getLlmExecutionProfile(id: LlmExecutionProfileId): LlmExecutionProfile {
  return id === "low_resource" ? LOW_RESOURCE_PROFILE : STANDARD_PROFILE;
}
