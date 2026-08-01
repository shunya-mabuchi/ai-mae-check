import { describe, expect, it } from "vitest";
import type { DetectionSummary, Finding } from "@ai-mae-check/core";
import type { ContextRiskCandidate } from "@ai-mae-check/llm";
import {
  createDemoDetectionResultsViewModel,
  DETECTION_RESULTS_EMPTY_MESSAGE,
  DETECTION_RESULTS_NO_CATEGORY_MESSAGE,
  LLM_CANDIDATE_NOTE
} from "./demoDetectionResultsView";

const emptySummary: DetectionSummary = {
  total: 0,
  critical: 0,
  high: 0,
  medium: 0,
  low: 0,
  byRule: {}
};

const emailFinding: Finding = {
  id: "finding-email",
  ruleId: "email",
  source: "rule",
  label: "メールアドレス",
  riskLevel: "high",
  category: "email",
  start: 8,
  end: 24,
  text: "taro@example.com",
  placeholder: "[EMAIL_1]",
  message: "外部へ貼り付ける前に強く確認したい情報です。",
  confidence: 1
};

const candidate: ContextRiskCandidate = {
  id: "candidate-person",
  category: "person_name",
  surface: "佐藤様",
  label: "人名候補",
  reason: "敬称つきの個人名らしい表現です。",
  riskLevel: "medium",
  suggestedPlaceholder: "[PERSON_1]",
  confidence: 0.86
};

describe("createDemoDetectionResultsViewModel", () => {
  it("検出結果が空のときの表示文言を返す", () => {
    const view = createDemoDetectionResultsViewModel({
      findings: [],
      selectedFindingIds: [],
      summary: emptySummary,
      llmStatus: "idle",
      llmCandidates: [],
      selectedCandidateIds: []
    });

    expect(view.totalText).toBe("0件");
    expect(view.categoryEmptyMessage).toBe(DETECTION_RESULTS_NO_CATEGORY_MESSAGE);
    expect(view.findingsEmptyMessage).toBe(DETECTION_RESULTS_EMPTY_MESSAGE);
    expect(view.findingItems).toEqual([]);
    expect(view.candidateItems).toEqual([]);
    expect(view.hasCandidates).toBe(false);
    expect(view.llmCandidateNote).toBe(LLM_CANDIDATE_NOTE);
  });

  it("リスクサマリー・カテゴリ・選択済み検出項目をまとめて返す", () => {
    const view = createDemoDetectionResultsViewModel({
      findings: [emailFinding],
      selectedFindingIds: [emailFinding.id],
      summary: {
        total: 1,
        critical: 0,
        high: 1,
        medium: 0,
        low: 0,
        byRule: { email: 1 }
      },
      llmStatus: "idle",
      llmCandidates: [],
      selectedCandidateIds: []
    });

    expect(view.totalText).toBe("1件");
    expect(view.categoryEmptyMessage).toBeNull();
    expect(view.findingsEmptyMessage).toBeNull();
    expect(view.riskSummary.status.label).toBe("要安全化");
    expect(view.riskSummary.categories).toEqual([{ label: "メールアドレス", count: 1 }]);
    expect(view.riskCountTiles.map((tile) => [tile.key, tile.count])).toEqual([
      ["high", 1],
      ["medium", 0],
      ["low", 0]
    ]);
    expect(view.findingItems[0]?.selected).toBe(true);
    expect(view.findingItems[0]?.sourceLabel).toBe("ルール");
  });

  it("AI文脈チェック候補の選択状態と表示可否を返す", () => {
    const view = createDemoDetectionResultsViewModel({
      findings: [],
      selectedFindingIds: [],
      summary: emptySummary,
      llmStatus: "done",
      llmCandidates: [candidate],
      selectedCandidateIds: [candidate.id]
    });

    expect(view.hasCandidates).toBe(true);
    expect(view.candidateItems).toHaveLength(1);
    expect(view.candidateItems[0]?.selected).toBe(true);
    expect(view.candidateItems[0]?.surface).toBe("佐藤様");
    expect(view.candidateItems[0]?.confidenceText).toBe("信頼度: 0.86");
  });
});
