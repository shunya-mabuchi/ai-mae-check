import { describe, expect, it } from "vitest";
import {
  buildContextRiskPrompt,
  buildSanitizePrompt,
  convertContextCandidatesToFindings,
  createSanitizeAnalysisResult,
  mergeResidualContextCandidates,
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

  it("敬称つき人名や候補者名を優先候補として指示する", () => {
    const messages = buildContextRiskPrompt(
      "佐藤様向けにProject Blue Bridgeの提案を作ります。候補者の山田花子さんについても確認します。"
    );
    const joined = messages.map((message) => message.content).join("\n");

    expect(joined).toContain("敬称つき人名");
    expect(joined).toContain("候補者名");
    expect(joined).toContain("Project Blue Bridge");
  });
});

describe("buildSanitizePrompt", () => {
  it("安全化でも敬称つき人名を残さないよう指示する", () => {
    const messages = buildSanitizePrompt("佐藤様向けの提案です。候補者の山田花子さんも含めます。");
    const joined = messages.map((message) => message.content).join("\n");

    expect(joined).toContain("敬称つき人名");
    expect(joined).toContain("safe_promptに残さない");
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

  it("Markdownコードブロックと前後の説明文が混ざってもJSON部分を読み取る", () => {
    const result = parseContextAnalysisJson(`確認しました。候補は以下です。

\`\`\`json
{
  "candidates": [
    {
      "category": "customer_name",
      "surface": "A社",
      "label": "顧客名候補",
      "reason": "提案文脈に含まれる名称です。",
      "riskLevel": "medium",
      "suggestedPlaceholder": "[CUSTOMER_1]",
      "confidence": 0.86
    }
  ],
  "summary": "顧客名候補があります。"
}
\`\`\`

補足: {これはJSONではありません}`);

    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]?.surface).toBe("A社");
    expect(result.summary).toBe("顧客名候補があります。");
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

describe("createSanitizeAnalysisResult", () => {
  it("安全化結果に残った入力由来の敬称つき人名と案件名を追加でマスクする", () => {
    const input =
      "佐藤様向けに、Project Blue Bridge の提案メモを作成します。\n候補者の山田花子さんについて、最終面談後の評価メモも含めます。";
    const result = createSanitizeAnalysisResult(
      JSON.stringify({
        block: false,
        risk_level: "medium",
        detected_categories: [
          { type: "person", risk: "medium", action: "mask" },
          { type: "other", risk: "medium", action: "mask" }
        ],
        safe_prompt:
          "佐藤様向けに、Project Blue Bridge の提案メモを作成します。\n候補者の山田花子さんについて確認します。",
        user_visible_explanation: "文脈情報を安全化しました。"
      }),
      "test-model",
      10,
      input
    );

    expect(result.safePrompt).not.toContain("佐藤様");
    expect(result.safePrompt).not.toContain("山田花子さん");
    expect(result.safePrompt).not.toContain("Project Blue Bridge");
    expect(result.safePrompt).toContain("[PERSON_1]");
    expect(result.safePrompt).toContain("[PERSON_2]");
    expect(result.safePrompt).toContain("[PROJECT_1]");
  });

  it("LLMが顧客名だけを置換して人名を残した場合も追加でマスクする", () => {
    const input =
      "A社の佐藤様向けに、Project Blue Bridge の提案メモを作成します。\n候補者の山田花子さんについて、最終面談後の評価メモも含めます。";
    const result = createSanitizeAnalysisResult(
      JSON.stringify({
        block: false,
        risk_level: "medium",
        detected_categories: [{ type: "organization", risk: "medium", action: "mask" }],
        safe_prompt:
          "[CUSTOMER_1]の佐藤様向けに、Project Blue Bridge の提案メモを作成します。\n候補者の山田花子さんについて確認します。",
        user_visible_explanation: "顧客名を置換しました。"
      }),
      "test-model",
      10,
      input
    );

    expect(result.safePrompt).not.toContain("佐藤様");
    expect(result.safePrompt).not.toContain("山田花子さん");
    expect(result.safePrompt).not.toContain("Project Blue Bridge");
  });
});

describe("mergeResidualContextCandidates", () => {
  it("WebLLMが返さなかった敬称つき人名と案件名をローカル補助候補として追加する", () => {
    const input =
      "A社の佐藤様向けに、Project Blue Bridge の提案メモを作成します。\n候補者の山田花子さんについて、最終面談後の評価メモも含めます。";
    const candidates = mergeResidualContextCandidates(input, []);

    expect(candidates.map((candidate) => candidate.surface)).toEqual(["Project Blue Bridge", "山田花子さん", "佐藤様"]);
    expect(candidates.map((candidate) => candidate.category)).toEqual(["project_name", "person_name", "person_name"]);
    expect(candidates.every((candidate) => candidate.confidence >= 0.75)).toBe(true);
  });

  it("既存のLLM候補と重複するsurfaceは追加しない", () => {
    const input = "候補者の山田花子さんについて確認します。";
    const candidates = mergeResidualContextCandidates(input, [
      {
        id: "llm-candidate-1",
        category: "person_name",
        surface: "候補者の山田花子さん",
        label: "人名候補",
        reason: "採用文脈の候補です。",
        riskLevel: "medium",
        suggestedPlaceholder: "[PERSON_1]",
        confidence: 0.9
      }
    ]);

    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.surface).toBe("候補者の山田花子さん");
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
