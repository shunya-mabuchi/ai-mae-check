import type { Finding, RiskLevel } from "@harumae/core";

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

export interface AnalyzeContextOptions {
  existingFindings?: Finding[];
  language?: "ja" | "en" | string;
  maxCandidates?: number;
  signal?: AbortSignal;
  onProgress?: (progress: LlmProgress) => void;
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
}

export interface LlmContextAnalyzer {
  analyze(input: string, options?: AnalyzeContextOptions): Promise<ContextAnalysisResult>;
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
