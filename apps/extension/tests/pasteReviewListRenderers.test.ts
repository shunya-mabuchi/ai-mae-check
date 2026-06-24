import { afterEach, describe, expect, it, vi } from "vitest";
import type { Finding } from "@ai-mae-check/core";
import type { ContextRiskCandidate } from "@ai-mae-check/llm";
import { renderReviewCandidateList, renderReviewFindingList } from "../src/lib/reviewListRenderers";
import { allElements, asDomElement, FakeElement, joinedText, stubFakeDocument } from "./helpers/fakeDom";

function finding(overrides: Partial<Finding> = {}): Finding {
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
    message: "外部へ貼り付ける前に確認したい情報です。",
    confidence: 0.99,
    ...overrides
  };
}

function candidate(overrides: Partial<ContextRiskCandidate> = {}): ContextRiskCandidate {
  return {
    id: "candidate-1",
    category: "person_name",
    surface: "山田花子さん",
    label: "人名候補",
    reason: "採用文脈に含まれる個人名候補です。",
    riskLevel: "medium",
    suggestedPlaceholder: "[PERSON_1]",
    confidence: 0.86,
    ...overrides
  };
}

describe("pasteReviewListRenderers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("検出項目一覧を描画し、チェック変更を選択状態へ反映する", () => {
    stubFakeDocument();
    const container = new FakeElement("div");
    const selectedIds = new Set(["finding-1"]);
    const onChange = vi.fn();

    renderReviewFindingList(asDomElement<HTMLElement>(container), [finding()], selectedIds, onChange);

    const text = joinedText(container);
    expect(text).toContain("メールアドレス");
    expect(text).toContain("taro@example.com");
    expect(text).toContain("安全化対象");

    const checkbox = allElements(container).find((element) => element.tagName === "input");
    expect(checkbox?.checked).toBe(true);

    if (!checkbox) {
      throw new Error("checkbox not found");
    }
    checkbox.checked = false;
    checkbox.dispatch("change");

    expect(selectedIds.has("finding-1")).toBe(false);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("AI文脈候補一覧を描画し、チェック変更を選択状態へ反映する", () => {
    stubFakeDocument();
    const container = new FakeElement("div");
    const selectedIds = new Set<string>();
    const onChange = vi.fn();

    renderReviewCandidateList(asDomElement<HTMLElement>(container), [candidate()], selectedIds, onChange);

    const text = joinedText(container);
    expect(text).toContain("人名候補");
    expect(text).toContain("山田花子さん");
    expect(text).toContain("confidence: 0.86");
    expect(text).toContain("安全化対象外");

    const checkbox = allElements(container).find((element) => element.tagName === "input");
    expect(checkbox?.checked).toBe(false);

    if (!checkbox) {
      throw new Error("checkbox not found");
    }
    checkbox.checked = true;
    checkbox.dispatch("change");

    expect(selectedIds.has("candidate-1")).toBe(true);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("候補が空の場合は空状態を描画する", () => {
    stubFakeDocument();
    const container = new FakeElement("div");

    renderReviewCandidateList(asDomElement<HTMLElement>(container), [], new Set(), vi.fn());

    expect(joinedText(container)).toContain("AI文脈チェックの追加候補はありません。");
  });
});
