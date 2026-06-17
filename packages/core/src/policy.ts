import { scoreRisk } from "./riskScore";
import type { DlpPolicyDecision, Finding } from "./types";

export function evaluateDlpPolicy(findings: Finding[]): DlpPolicyDecision {
  const risk = scoreRisk(findings);

  if (risk.blocked) {
    return {
      action: "sanitize_required",
      canSendRaw: false,
      requiresSanitization: true,
      risk,
      message: "高リスクまたは秘密情報保護の対象が含まれるため、安全化が必要です。"
    };
  }

  if (risk.level === "medium") {
    return {
      action: "confirm",
      canSendRaw: true,
      requiresSanitization: false,
      risk,
      message: "送信前に詳細確認が必要な候補があります。"
    };
  }

  return {
    action: "allow",
    canSendRaw: true,
    requiresSanitization: false,
    risk,
    message: "そのまま送信できる範囲の判定です。"
  };
}
