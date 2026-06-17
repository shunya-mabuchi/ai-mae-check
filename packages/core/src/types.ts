export type RiskLevel = "critical" | "high" | "medium" | "low";

export type RiskDecisionLevel = "safe" | "low" | "medium" | "high" | "critical";

export type DlpCategory =
  | "person"
  | "organization"
  | "address"
  | "email"
  | "phone"
  | "id"
  | "secret"
  | "financial"
  | "medical"
  | "legal"
  | "date"
  | "url"
  | "file"
  | "other";

export type TransformMode = "mask" | "generalize";

export type FindingSource = "rule" | "llm";

export interface Finding {
  id: string;
  ruleId: string;
  source: FindingSource;
  label: string;
  riskLevel: RiskLevel;
  category?: DlpCategory;
  start: number;
  end: number;
  text: string;
  placeholder: string;
  message: string;
  confidence: number;
}

export interface DetectionSummary {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  byRule: Record<string, number>;
}

export interface PlaceholderMapEntry {
  placeholder: string;
  originalText: string;
  label: string;
  riskLevel: RiskLevel;
}

export type PlaceholderMap = PlaceholderMapEntry[];

export interface DetectionResult {
  findings: Finding[];
  summary: DetectionSummary;
  highestRiskLevel: RiskLevel | null;
  maskedText: string;
  placeholderMap: PlaceholderMap;
}

export interface MaskResult {
  maskedText: string;
  placeholderMap: PlaceholderMap;
  findings: Finding[];
}

export interface DetectorRule {
  id: string;
  label: string;
  riskLevel: RiskLevel;
  enabled: boolean;
  createFindings(input: string): Finding[];
}

export interface DetectOptions {
  enabledRuleIds?: string[];
  disabledRuleIds?: string[];
  minRiskLevel?: RiskLevel;
  includeLowRisk?: boolean;
  extraRules?: DetectorRule[];
}

export interface RiskScoreResult {
  score: number;
  level: RiskDecisionLevel;
  blocked: boolean;
  secretGuard: boolean;
  categoryCounts: Record<string, number>;
  reasons: string[];
}

export interface RiskScoreOptions {
  blockAtLevel?: RiskDecisionLevel;
}

export type DlpPolicyAction = "allow" | "confirm" | "sanitize_required";

export interface DlpPolicyDecision {
  action: DlpPolicyAction;
  canSendRaw: boolean;
  requiresSanitization: boolean;
  risk: RiskScoreResult;
  message: string;
}

export interface TextTransformResult {
  mode: TransformMode;
  transformedText: string;
  placeholderMap: PlaceholderMap;
  findings: Finding[];
  requiresLlm: boolean;
}
