import { describe, expect, it } from "vitest";
import type { DetectionResult, Finding } from "@ai-mae-check/core";
import type { ContextRiskCandidate } from "@ai-mae-check/llm";
import { createDemoMaskingViewModel, selectCandidateIdsByConfidence } from "./demoMasking";

function ruleFinding(): Finding {
  return {
    id: "rule-email",
    ruleId: "email",
    source: "rule",
    label: "メールアドレス",
    riskLevel: "high",
    start: 3,
    end: 19,
    text: "taro@example.com",
    placeholder: "[EMAIL_1]",
    message: "外部へ貼り付ける前に確認したい情報です。",
    confidence: 1
  };
}

function detection(findings: Finding[]): DetectionResult {
  return {
    findings,
    summary: {
      total: findings.length,
      critical: 0,
      high: findings.filter((finding) => finding.riskLevel === "high").length,
      medium: findings.filter((finding) => finding.riskLevel === "medium").length,
      low: findings.filter((finding) => finding.riskLevel === "low").length,
      byRule: {}
    },
    highestRiskLevel: findings[0]?.riskLevel ?? "low",
    maskedText: "",
    placeholderMap: []
  };
}

function llmCandidate(confidence: number): ContextRiskCandidate {
  return {
    id: "candidate-customer",
    category: "customer_name",
    surface: "A社",
    label: "顧客名候補",
    reason: "提案文脈に含まれる名称です。",
    riskLevel: "medium",
    suggestedPlaceholder: "[CUSTOMER_1]",
    confidence
  };
}

describe("demoMasking", () => {
  it("選択されたルール検出とAI候補からマスク後テキストを作る", () => {
    const inputText = "連絡 taro@example.com A社向け提案";
    const viewModel = createDemoMaskingViewModel({
      inputText,
      detection: detection([ruleFinding()]),
      selectedRuleFindingIds: ["rule-email"],
      llmCandidates: [llmCandidate(0.86)],
      selectedCandidateIds: ["candidate-customer"]
    });

    expect(viewModel.selectedRuleFindings.map((finding) => finding.id)).toEqual(["rule-email"]);
    expect(viewModel.selectedLlmFindings.map((finding) => finding.text)).toEqual(["A社"]);
    expect(viewModel.maskedText).toBe("連絡 [EMAIL_1] [CUSTOMER_1]向け提案");
  });

  it("検出済みでもマスク対象が未選択なら元テキストを返す", () => {
    const inputText = "連絡 taro@example.com";
    const viewModel = createDemoMaskingViewModel({
      inputText,
      detection: detection([ruleFinding()]),
      selectedRuleFindingIds: [],
      llmCandidates: [],
      selectedCandidateIds: []
    });

    expect(viewModel.maskedText).toBe(inputText);
    expect(viewModel.mergedFindings).toEqual([]);
  });

  it("検出前で候補もない場合は空のマスク結果にする", () => {
    const viewModel = createDemoMaskingViewModel({
      inputText: "まだ検出していない文章",
      detection: null,
      selectedRuleFindingIds: [],
      llmCandidates: [],
      selectedCandidateIds: []
    });

    expect(viewModel.maskedText).toBe("");
  });

  it("高信頼度のAI候補だけを初期選択する", () => {
    const candidates = [
      { ...llmCandidate(0.74), id: "low" },
      { ...llmCandidate(0.75), id: "border" },
      { ...llmCandidate(0.91), id: "high" }
    ];

    expect(selectCandidateIdsByConfidence(candidates)).toEqual(["border", "high"]);
  });
});
