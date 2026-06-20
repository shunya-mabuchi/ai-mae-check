import { describe, expect, it } from "vitest";
import {
  createInitialSelectedCandidateIds,
  createInitialSelectedFindingIds,
  handlePasteReviewSelectionToggle,
  resolvePasteReviewFindings,
  updateSelectedIdSet
} from "../src/lib/pasteReviewSelection";
import { buildContextRiskCandidate, buildFinding } from "./testBuilders";

describe("pasteReviewSelection", () => {
  it("ルール検出項目は初期状態ですべてマスク対象にする", () => {
    const findings = [buildFinding({ id: "a" }), buildFinding({ id: "b" })];

    const selectedIds = createInitialSelectedFindingIds(findings);

    expect([...selectedIds]).toEqual(["a", "b"]);
  });

  it("LLM候補は信頼度がしきい値以上のものだけ初期選択する", () => {
    const candidates = [
      buildContextRiskCandidate({ id: "high", confidence: 0.75 }),
      buildContextRiskCandidate({ id: "low", confidence: 0.74 })
    ];

    const selectedIds = createInitialSelectedCandidateIds(candidates);

    expect([...selectedIds]).toEqual(["high"]);
  });

  it("選択されたルール検出項目とLLM候補だけをマスク対象Findingに変換する", () => {
    const input = "taro@example.com と Project Blue を外部AIに貼る前に確認します。";
    const ruleFindings = [
      buildFinding({ id: "email", start: 0, end: 16, text: "taro@example.com" }),
      buildFinding({ id: "phone", ruleId: "phone", text: "090-1234-5678", start: 100, end: 113 })
    ];
    const candidates = [
      buildContextRiskCandidate({ id: "project", surface: "Project Blue" }),
      buildContextRiskCandidate({ id: "missing", surface: "存在しない候補" })
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
