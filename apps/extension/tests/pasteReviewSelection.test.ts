import type { Finding } from "@ai-mae-check/core";
import type { ContextRiskCandidate } from "@ai-mae-check/llm";
import { describe, expect, it } from "vitest";
import {
  createInitialSelectedCandidateIds,
  createInitialSelectedFindingIds,
  handlePasteReviewSelectionToggle,
  resolvePasteReviewFindings,
  updateSelectedIdSet
} from "../src/lib/pasteReviewSelection";

function createFinding(overrides: Partial<Finding>): Finding {
  return {
    id: "finding-1",
    ruleId: "email",
    source: "rule",
    label: "メールアドレス",
    riskLevel: "high",
    start: 0,
    end: 16,
    text: "taro@example.com",
    placeholder: "[EMAIL_1]",
    message: "外部へ貼り付ける前に強く確認したい情報です。",
    confidence: 1,
    ...overrides
  };
}

function createCandidate(overrides: Partial<ContextRiskCandidate>): ContextRiskCandidate {
  return {
    id: "candidate-1",
    category: "project_name",
    surface: "Project Blue",
    label: "案件名候補",
    reason: "案件名の可能性があります。",
    riskLevel: "medium",
    suggestedPlaceholder: "[PROJECT_1]",
    confidence: 0.9,
    ...overrides
  };
}

describe("pasteReviewSelection", () => {
  it("ルール検出項目は初期状態ですべてマスク対象にする", () => {
    const findings = [createFinding({ id: "a" }), createFinding({ id: "b" })];

    const selectedIds = createInitialSelectedFindingIds(findings);

    expect([...selectedIds]).toEqual(["a", "b"]);
  });

  it("LLM候補は信頼度がしきい値以上のものだけ初期選択する", () => {
    const candidates = [
      createCandidate({ id: "high", confidence: 0.75 }),
      createCandidate({ id: "low", confidence: 0.74 })
    ];

    const selectedIds = createInitialSelectedCandidateIds(candidates);

    expect([...selectedIds]).toEqual(["high"]);
  });

  it("選択されたルール検出項目とLLM候補だけをマスク対象Findingに変換する", () => {
    const input = "taro@example.com と Project Blue を外部AIに貼る前に確認します。";
    const ruleFindings = [
      createFinding({ id: "email", start: 0, end: 16, text: "taro@example.com" }),
      createFinding({ id: "phone", ruleId: "phone", text: "090-1234-5678", start: 100, end: 113 })
    ];
    const candidates = [
      createCandidate({ id: "project", surface: "Project Blue" }),
      createCandidate({ id: "missing", surface: "存在しない候補" })
    ];

    const findings = resolvePasteReviewFindings({
      input,
      ruleFindings,
      selectedRuleFindingIds: new Set(["email"]),
      candidates,
      selectedCandidateIds: new Set(["project", "missing"])
    });

    expect(findings.map((finding) => finding.text)).toEqual(["taro@example.com", "Project Blue"]);
    expect(findings.every((finding) => finding.text !== "090-1234-5678")).toBe(true);
    expect(findings.every((finding) => finding.text !== "存在しない候補")).toBe(true);
  });

  it("チェック状態に応じて選択済みID Setを更新する", () => {
    const selectedIds = new Set(["email", "phone"]);

    updateSelectedIdSet(selectedIds, "project", true);
    expect([...selectedIds]).toEqual(["email", "phone", "project"]);

    updateSelectedIdSet(selectedIds, "phone", false);
    expect([...selectedIds]).toEqual(["email", "project"]);
  });

  it("選択トグル時にID Setを更新して変更通知を呼ぶ", () => {
    const selectedIds = new Set(["email"]);
    let changeCount = 0;

    handlePasteReviewSelectionToggle({
      selectedIds,
      id: "project",
      checked: true,
      onChange: () => {
        changeCount += 1;
      }
    });
    handlePasteReviewSelectionToggle({
      selectedIds,
      id: "email",
      checked: false,
      onChange: () => {
        changeCount += 1;
      }
    });

    expect([...selectedIds]).toEqual(["project"]);
    expect(changeCount).toBe(2);
  });
});
