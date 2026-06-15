import {
  detectSensitiveText,
  evaluateDlpPolicy,
  normalizeFindings,
  transformText,
  type DetectionResult,
  type DlpPolicyDecision,
  type Finding
} from "@ai-mae-check/core";

export type PasteGuardAction = "allow" | "confirm" | "sanitize_required";
export type PasteReplacementMode = "remove" | "safe";

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

function removeFindings(inputText: string, findings: Finding[]): string {
  let result = inputText;

  for (const finding of [...normalizeFindings(findings)].sort((left, right) => right.start - left.start)) {
    result = `${result.slice(0, finding.start)}${result.slice(finding.end)}`;
  }

  return result;
}

export function createPasteReplacement(inputText: string, findings: Finding[], mode: PasteReplacementMode): string {
  if (mode === "remove") {
    return removeFindings(inputText, findings);
  }

  return transformText(inputText, findings, "generalize").transformedText;
}
