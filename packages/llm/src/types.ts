import type { Finding, RiskLevel } from "@ai-mae-check/core";

export interface LlmProgress {
  phase: "loading" | "analyzing" | "done" | "error";
  message: string;
  progress?: number;
}

export type LlmErrorKind =
  | "model_fetch"
  | "model_configuration"
  | "storage"
  | "memory"
  | "worker"
  | "wasm"
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
  | "location_name"
  | "facility_name"
  | "product_name"
  | "event_name"
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
  start?: number;
  end?: number;
}

export interface ContextAnalysisResult {
  candidates: ContextRiskCandidate[];
  summary: string;
  rawText: string;
  modelId: string;
  modelIds?: string[];
  elapsedMs: number;
  error?: string;
  errorDetail?: LlmErrorDetail;
  warnings?: LlmErrorDetail[];
}

export interface LlmContextAnalyzer {
  prepare(onProgress?: (progress: LlmProgress) => void): Promise<void>;
  analyze(input: string, options?: AnalyzeContextOptions): Promise<ContextAnalysisResult>;
  isReady(): boolean;
  dispose(): Promise<void>;
}

export interface ConvertCandidatesOptions {
  confidenceThreshold?: number;
  includeAllOccurrences?: boolean;
}
