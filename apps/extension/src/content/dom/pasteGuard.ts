import {
  detectSensitiveText,
  evaluateDlpPolicy,
  transformText,
  type DetectionResult,
  type DlpPolicyDecision,
  type Finding
} from "@ai-mae-check/core";

export type PasteGuardAction = "allow" | "confirm" | "sanitize_required";

export interface PasteGuardOptions {
  disabledRuleIds?: string[];
}

export interface PasteGuardResult {
  inputText: string;
  detection: DetectionResult;
  policy: DlpPolicyDecision;
  action: PasteGuardAction;
  rawPasteAllowed: boolean;
}

function actionFromPolicy(policy: DlpPolicyDecision, hasFindings: boolean): PasteGuardAction {
  if (!hasFindings || policy.action === "allow") {
    return "allow";
  }

  return policy.requiresSanitization ? "sanitize_required" : "confirm";
}

export function evaluatePasteGuard(inputText: string, options: PasteGuardOptions = {}): PasteGuardResult {
  const detection = detectSensitiveText(
    inputText,
    options.disabledRuleIds ? { disabledRuleIds: options.disabledRuleIds } : {}
  );
  const policy = evaluateDlpPolicy(detection.findings);
  const action = actionFromPolicy(policy, detection.findings.length > 0);

  return {
    inputText,
    detection,
    policy,
    action,
    rawPasteAllowed: action !== "sanitize_required"
  };
}

export function createPasteReplacement(inputText: string, findings: Finding[]): string {
  return transformText(inputText, findings, "generalize").transformedText;
}
