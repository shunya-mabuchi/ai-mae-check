import { describe, expect, it } from "vitest";
import { mergeResidualContextCandidates } from "../src";

describe("mergeResidualContextCandidatesの業務カテゴリ優先順位", () => {
  it("明確な人事語を含む文ではモデルの競合カテゴリより具体語を優先する", () => {
    const input = "給与条件は、内定前に社内だけで確認したいです。";
    const candidates = mergeResidualContextCandidates(input, [
      {
        id: "model-contract-1",
        category: "contract_info",
        surface: input,
        label: "契約情報候補",
        reason: "契約に近い文脈です。",
        riskLevel: "medium",
        suggestedPlaceholder: "[CONTRACT_INFO_1]",
        confidence: 0.79
      }
    ]);

    expect(candidates).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "model-contract-1" })])
    );
    expect(candidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ category: "hr_info", surface: "給与条件" }),
        expect.objectContaining({ category: "hr_info", surface: "内定前" }),
        expect.objectContaining({ category: "internal_info", surface: "社内だけで確認" })
      ])
    );
  });

  it("明確な業務語を含む同カテゴリの全文候補も具体語へ集約する", () => {
    const input = "まだ正式発表前なので、社外共有はしない前提でお願いします。";
    const candidates = mergeResidualContextCandidates(input, [
      {
        id: "model-confidential-1",
        category: "confidential_context",
        surface: input,
        label: "未公開・社外秘文脈候補",
        reason: "未公開に近い文脈です。",
        riskLevel: "medium",
        suggestedPlaceholder: "[CONFIDENTIAL_CONTEXT_1]",
        confidence: 0.81
      }
    ]);

    expect(candidates).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "model-confidential-1" })])
    );
    expect(candidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ category: "confidential_context", surface: "正式発表前" }),
        expect.objectContaining({ category: "confidential_context", surface: "社外共有はしない" })
      ])
    );
  });

  it("具体語に一致しないモデルの文脈候補は維持する", () => {
    const input = "取引先との調整内容は公開範囲を慎重に判断してください。";
    const modelCandidate = {
      id: "model-internal-1",
      category: "internal_info" as const,
      surface: input,
      label: "社内情報候補",
      reason: "社内情報に近い文脈です。",
      riskLevel: "medium" as const,
      suggestedPlaceholder: "[INTERNAL_INFO_1]",
      confidence: 0.83
    };

    expect(mergeResidualContextCandidates(input, [modelCandidate])).toEqual([modelCandidate]);
  });
});
