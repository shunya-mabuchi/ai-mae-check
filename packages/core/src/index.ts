export { detectSensitiveText } from "./detect";
export { createPlaceholderMap, maskSensitiveText, mergeFindings, normalizeFindings } from "./mask";
export { detectorRules } from "./rules";
export type {
  DetectionResult,
  DetectionSummary,
  DetectorRule,
  DetectOptions,
  Finding,
  FindingSource,
  MaskResult,
  PlaceholderMap,
  PlaceholderMapEntry,
  RiskLevel
} from "./types";
