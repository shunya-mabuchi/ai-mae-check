import type { Finding, RiskLevel } from "@ai-mae-check/core";

export interface LlmAnalyzerOptions {
  modelId?: string;
  temperature?: number;
  maxTokens?: number;
  maxInputChars?: number;
  confidenceThreshold?: number;
  workerUrl?: string;
}

export interface LlmProgress {
  phase: "loading" | "analyzing" | "done" | "error";
  message: string;
  progress?: number;
}

export type LlmErrorKind =
  | "model_fetch"
  | "webgpu"
  | "storage"
  | "memory"
  | "worker"
  | "wasm"
  | "json_parse"
  | "timeout"
  | "unknown";

export interface LlmErrorDetail {
  kind: LlmErrorKind;
  message: string;
  hint: string;
  technicalDetail?: string;
}

export interface AnalyzeContextOptions {
  existingFindings?: Finding[];
  language?: "ja" | "en" | string;
  maxCandidates?: number;
  signal?: AbortSignal;
  onProgress?: (progress: LlmProgress) => void;
}

export type ContextHintReason =
  | "near_secret"
  | "near_confidential_hint"
  | "near_person_like"
  | "near_money"
  | "near_business_context";

export interface ContextHintResult {
  shouldOffer: boolean;
  score: number;
  reasons: ContextHintReason[];
}

export interface ContextWindow {
  text: string;
  reason: ContextHintReason;
}

export interface ContextCheckPlan {
  windows: ContextWindow[];
  existingFindings: Finding[];
  maxCandidates: number;
}

export interface ContextCheckPlanOptions {
  existingFindings?: Finding[];
  maxCandidates?: number;
  maxInputChars?: number;
  windowChars?: number;
}

export type ContextRiskCategory =
  | "person_name"
  | "company_name"
  | "customer_name"
  | "project_name"
  | "contract_info"
  | "hr_info"
  | "legal_info"
  | "financial_info"
  | "internal_info"
  | "confidential_context"
  | "other";

export interface ContextRiskCandidate {
  id: string;
  category: ContextRiskCategory;
  surface: string;
  label: string;
  reason: string;
  riskLevel: RiskLevel;
  suggestedPlaceholder: string;
  confidence: number;
}

export interface ContextAnalysisResult {
  candidates: ContextRiskCandidate[];
  summary: string;
  rawText: string;
  modelId: string;
  elapsedMs: number;
  error?: string;
  errorDetail?: LlmErrorDetail;
}

export interface LlmContextAnalyzer {
  analyze(input: string, options?: AnalyzeContextOptions): Promise<ContextAnalysisResult>;
  isReady(): boolean;
  dispose(): void;
}

export interface ConvertCandidatesOptions {
  confidenceThreshold?: number;
  includeAllOccurrences?: boolean;
}

export interface ContextPromptOptions {
  existingFindings?: Finding[];
  maxCandidates?: number;
}

export interface ChatMessage {
  role: "system" | "user";
  content: string;
}
