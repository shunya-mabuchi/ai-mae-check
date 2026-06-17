import { afterEach, describe, expect, it, vi } from "vitest";
import type { Finding } from "@ai-mae-check/core";
import type { ContextRiskCandidate } from "@ai-mae-check/llm";
import { renderPasteReviewCandidateList, renderPasteReviewFindingList } from "../src/lib/pasteReviewListRenderers";

type Listener = () => void;

class FakeElement {
  className = "";
  textContent = "";
  type = "";
  checked = false;
  readonly children: FakeElement[] = [];
  private readonly listeners = new Map<string, Listener[]>();

  constructor(readonly tagName: string) {}

  append(...children: FakeElement[]): void {
    this.children.push(...children);
  }

  replaceChildren(...children: FakeElement[]): void {
    this.children.splice(0, this.children.length, ...children);
  }

  addEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    const listeners = this.listeners.get(type) ?? [];
    if (typeof listener === "function") {
      listeners.push(() => listener(new Event(type)));
    } else {
      listeners.push(() => listener.handleEvent(new Event(type)));
    }
    this.listeners.set(type, listeners);
  }

  dispatch(type: string): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener();
    }
  }
}

function stubDocument(): void {
  vi.stubGlobal("document", {
    createElement: vi.fn((tagName: string) => new FakeElement(tagName))
  });
}

function allElements(root: FakeElement): FakeElement[] {
  return [root, ...root.children.flatMap(allElements)];
}

function joinedText(root: FakeElement): string {
  return allElements(root)
    .map((element) => element.textContent)
    .filter((text) => text.length > 0)
    .join("\n");
}

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
    stubDocument();
    const container = new FakeElement("div");
    const selectedIds = new Set(["finding-1"]);
    const onChange = vi.fn();

    renderPasteReviewFindingList(container as unknown as HTMLElement, [finding()], selectedIds, onChange);

    const text = joinedText(container);
    expect(text).toContain("メールアドレス");
    expect(text).toContain("taro@example.com");
    expect(text).toContain("マスク対象");

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
    stubDocument();
    const container = new FakeElement("div");
    const selectedIds = new Set<string>();
    const onChange = vi.fn();

    renderPasteReviewCandidateList(container as unknown as HTMLElement, [candidate()], selectedIds, onChange);

    const text = joinedText(container);
    expect(text).toContain("人名候補");
    expect(text).toContain("山田花子さん");
    expect(text).toContain("confidence: 0.86");
    expect(text).toContain("マスク対象外");

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
    stubDocument();
    const container = new FakeElement("div");

    renderPasteReviewCandidateList(container as unknown as HTMLElement, [], new Set(), vi.fn());

    expect(joinedText(container)).toContain("AI文脈チェックの追加候補はありません。");
  });
});
