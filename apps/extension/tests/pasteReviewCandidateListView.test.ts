import { describe, expect, it } from "vitest";
import type { ContextRiskCandidate } from "@ai-mae-check/llm";
import { createPasteReviewCandidateListView } from "../src/lib/pasteReviewCandidateListView";

function candidate(overrides: Partial<ContextRiskCandidate> = {}): ContextRiskCandidate {
  return {
    id: "candidate-1",
    category: "person_name",
    surface: "山田花子さん",
    label: "人名候補",
    reason: "採用文脈に含まれる個人名候補です。",
    riskLevel: "medium",
    suggestedPlaceholder: "[PERSON_1]",
    confidence: 0.876,
    ...overrides
  };
}

describe("createPasteReviewCandidateListView", () => {
  it("候補がない場合は空状態メッセージを返す", () => {
    const view = createPasteReviewCandidateListView([], new Set());

    expect(view).toEqual({
      emptyMessage: "AI文脈チェックの追加候補はありません。",
      items: []
    });
  });

  it("候補がある場合は表示情報と選択状態を返す", () => {
    const view = createPasteReviewCandidateListView(
      [candidate(), candidate({ id: "candidate-2", surface: "Project Blue Bridge", riskLevel: "low", confidence: 0.7 })],
      new Set(["candidate-1"])
    );

    expect(view.emptyMessage).toBeUndefined();
    expect(view.items).toHaveLength(2);
    expect(view.items[0]).toMatchObject({
      id: "candidate-1",
      selected: true,
      surface: "山田花子さん",
      label: "人名候補",
      reason: "採用文脈に含まれる個人名候補です。",
      riskBadgeText: "危険度: 中",
      confidenceText: "confidence: 0.88",
      selectionLabel: "マスク対象"
    });
    expect(view.items[1]).toMatchObject({
      id: "candidate-2",
      selected: false,
      surface: "Project Blue Bridge",
      riskBadgeText: "危険度: 低",
      confidenceText: "confidence: 0.70",
      selectionLabel: "マスク対象外"
    });
  });
});
