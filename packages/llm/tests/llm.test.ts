import { describe, expect, it } from "vitest";
import {
  buildContextRiskPrompt,
  convertContextCandidatesToFindings,
  parseContextAnalysisJson,
  type ContextRiskCandidate
} from "../src";

describe("buildContextRiskPrompt", () => {
  it("日本語のJSON指示と入力文を含める", () => {
    const messages = buildContextRiskPrompt("A社向けの提案資料です。");
    const joined = messages.map((message) => message.content).join("\n");

    expect(joined).toContain("必ずJSONだけを返す");
    expect(joined).toContain("A社向けの提案資料です。");
    expect(joined).toContain("surfaceには入力文中に実在する短い文字列");
  });
});

describe("parseContextAnalysisJson", () => {
  it("正常なJSONを候補として読み取る", () => {
    const result = parseContextAnalysisJson(
      JSON.stringify({
        candidates: [
          {
            category: "customer_name",
            surface: "A社",
            label: "顧客名候補",
            reason: "提案文脈に含まれています。",
            riskLevel: "medium",
            suggestedPlaceholder: "[CUSTOMER_1]",
            confidence: 0.82
          }
        ],
        summary: "顧客名候補があります。"
      })
    );

    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]?.category).toBe("customer_name");
    expect(result.summary).toBe("顧客名候補があります。");
  });

  it("不正JSONではエラーにする", () => {
    expect(() => parseContextAnalysisJson("JSONではありません")).toThrow("AI文脈チェックの結果を読み取れませんでした");
  });

  it("confidenceThreshold未満を捨てる", () => {
    const result = parseContextAnalysisJson(
      JSON.stringify({
        candidates: [
          {
            category: "company_name",
            surface: "A社",
            label: "会社名候補",
            reason: "文脈上の候補です。",
            riskLevel: "low",
            suggestedPlaceholder: "[COMPANY_1]",
            confidence: 0.4
          }
        ],
        summary: "候補なし"
      }),
      { confidenceThreshold: 0.6 }
    );

    expect(result.candidates).toEqual([]);
  });
});

describe("convertContextCandidatesToFindings", () => {
  const candidate: ContextRiskCandidate = {
    id: "1",
    category: "customer_name",
    surface: "A社",
    label: "顧客名候補",
    reason: "提案資料の文脈に含まれています。",
    riskLevel: "medium",
    suggestedPlaceholder: "[CUSTOMER_1]",
    confidence: 0.88
  };

  it("ContextRiskCandidateをFindingへ変換する", () => {
    const findings = convertContextCandidatesToFindings("A社向けの提案です。A社には未共有です。", [candidate]);

    expect(findings).toHaveLength(2);
    expect(findings[0]?.source).toBe("llm");
    expect(findings[0]?.placeholder).toBe("[CUSTOMER_1]");
    expect(findings[1]?.placeholder).toBe("[CUSTOMER_2]");
  });

  it("入力文に存在しないsurfaceは捨てる", () => {
    const findings = convertContextCandidatesToFindings("B社向けの提案です。", [candidate]);

    expect(findings).toEqual([]);
  });

  it("confidenceThreshold未満の候補を捨てる", () => {
    const lowConfidenceCandidate = {
      ...candidate,
      confidence: 0.3
    };

    const findings = convertContextCandidatesToFindings("A社向けの提案です。", [lowConfidenceCandidate], {
      confidenceThreshold: 0.6
    });

    expect(findings).toEqual([]);
  });
});
