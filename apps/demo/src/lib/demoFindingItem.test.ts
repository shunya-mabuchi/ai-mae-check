import { describe, expect, it } from "vitest";
import type { Finding } from "@ai-mae-check/core";
import { createDemoFindingItemViewModel } from "./demoFindingItem";

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
    message: "外部へ貼り付ける前に強く確認したい情報です。",
    confidence: 1,
    ...overrides
  };
}

describe("createDemoFindingItemViewModel", () => {
  it("ルール由来の選択済み検出項目を表示用に変換する", () => {
    expect(createDemoFindingItemViewModel(finding(), true)).toEqual({
      id: "finding-1",
      selected: true,
      label: "メールアドレス",
      text: "taro@example.com",
      message: "外部へ貼り付ける前に強く確認したい情報です。",
      riskBadgeText: "危険度: 高",
      riskBadgeClassName: "rounded-card border px-2 py-1 text-xs font-bold border-rose-200 bg-rose-50 text-rose-700",
      sourceLabel: "ルール",
      selectionLabel: "マスク対象",
      selectionClassName: "text-xs font-black text-leaf"
    });
  });

  it("AI候補由来の対象外検出項目を表示用に変換する", () => {
    expect(
      createDemoFindingItemViewModel(
        finding({
          id: "llm-1",
          source: "llm",
          label: "人名候補",
          riskLevel: "medium",
          text: "山田花子さん"
        }),
        false
      )
    ).toMatchObject({
      id: "llm-1",
      selected: false,
      riskBadgeText: "危険度: 中",
      riskBadgeClassName: "rounded-card border px-2 py-1 text-xs font-bold border-amber-200 bg-amber-50 text-amber-800",
      sourceLabel: "AI候補",
      selectionLabel: "対象外",
      selectionClassName: "text-xs font-black text-muted"
    });
  });

  it("低リスクの危険度表示も既存トーンで返す", () => {
    expect(createDemoFindingItemViewModel(finding({ riskLevel: "low" }), true)).toMatchObject({
      riskBadgeText: "危険度: 低",
      riskBadgeClassName: "rounded-card border px-2 py-1 text-xs font-bold border-slate-200 bg-slate-100 text-slate-700"
    });
  });
});
