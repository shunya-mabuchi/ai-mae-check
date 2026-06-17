import { describe, expect, it } from "vitest";
import { createContextAnalysisResultFromRawText } from "../src/analysisResult";

describe("createContextAnalysisResultFromRawText", () => {
  it("正常なJSON出力をContextAnalysisResultへ変換し、ローカル補助候補を追加する", () => {
    const result = createContextAnalysisResultFromRawText({
      input: "A社の佐藤様向けに、Project Blue Bridge の提案メモを作成します。",
      rawText: JSON.stringify({
        candidates: [
          {
            category: "customer_name",
            surface: "A社",
            label: "顧客名候補",
            reason: "提案文脈に含まれています。",
            riskLevel: "medium",
            suggestedPlaceholder: "[CUSTOMER_1]",
            confidence: 0.84
          }
        ],
        summary: "顧客名候補があります。"
      }),
      modelId: "test-model",
      elapsedMs: 25
    });

    expect(result).toMatchObject({
      summary: "顧客名候補があります。",
      rawText: expect.any(String),
      modelId: "test-model",
      elapsedMs: 25
    });
    expect(result.error).toBeUndefined();
    expect(result.candidates.map((candidate) => candidate.surface)).toEqual(["A社", "Project Blue Bridge", "佐藤様"]);
  });

  it("JSONを読み取れない場合はローカル補助候補を使った非致命結果にする", () => {
    const result = createContextAnalysisResultFromRawText({
      input: "候補者の山田花子さんについて、最終面談後の評価メモも含めます。",
      rawText: "候補としては山田花子さんに注意してください。",
      modelId: "test-model",
      elapsedMs: 40
    });

    expect(result.error).toBeUndefined();
    expect(result.errorDetail).toBeUndefined();
    expect(result.summary).toBe("ブラウザ内の補助検出で注意候補を確認しました。安全化対象を選んで続行できます。");
    expect(result.candidates.map((candidate) => candidate.surface)).toEqual(["山田花子さん"]);
  });

  it("JSONを読み取れず補助候補もない場合はルールベース継続メッセージにする", () => {
    const result = createContextAnalysisResultFromRawText({
      input: "来週の定例会議の議事録を整理します。",
      rawText: "追加でマスクすべき候補は特に見当たりません。",
      modelId: "test-model",
      elapsedMs: 10
    });

    expect(result.candidates).toEqual([]);
    expect(result.summary).toBe("ルールベース検出結果で安全化できます。AI文脈チェックは必要に応じて再実行してください。");
  });

  it("confidenceThresholdとmaxCandidatesを結果生成時に反映する", () => {
    const result = createContextAnalysisResultFromRawText({
      input: "A社の佐藤様向けに、Project Blue Bridge の提案メモを作成します。",
      rawText: JSON.stringify({
        candidates: [
          {
            category: "customer_name",
            surface: "A社",
            label: "顧客名候補",
            reason: "提案文脈に含まれています。",
            riskLevel: "medium",
            suggestedPlaceholder: "[CUSTOMER_1]",
            confidence: 0.4
          }
        ],
        summary: "候補があります。"
      }),
      modelId: "test-model",
      elapsedMs: 12,
      confidenceThreshold: 0.75,
      maxCandidates: 1
    });

    expect(result.candidates.map((candidate) => candidate.surface)).toEqual(["Project Blue Bridge"]);
  });
});
