export type RiskLevel = "high" | "medium" | "low";

export type FindingSource = "rule" | "llm";

export interface Finding {
  id: string;
  ruleId: string;
  source: FindingSource;
  label: string;
  riskLevel: RiskLevel;
  start: number;
  end: number;
  text: string;
  placeholder: string;
  message: string;
  confidence: number;
}

export interface DetectionSummary {
  total: number;
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
}
