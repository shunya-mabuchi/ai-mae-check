import { describe, expect, it } from "vitest";
import type { Finding } from "@ai-mae-check/core";
import { createInitialSelectedFindingIds, toggleSelectedId } from "./demoSelection";

function finding(id: string): Finding {
  return {
    id,
    ruleId: "email",
    source: "rule",
    label: "メールアドレス",
    riskLevel: "high",
    start: 0,
    end: 16,
    text: "taro@example.com",
    placeholder: "[EMAIL_1]",
    message: "外部へ貼り付ける前に確認したい情報です。",
    confidence: 1
  };
}

describe("demoSelection", () => {
  it("未選択のIDを末尾に追加する", () => {
    expect(toggleSelectedId(["email"], "phone")).toEqual(["email", "phone"]);
  });

  it("選択済みのIDを取り除く", () => {
    expect(toggleSelectedId(["email", "phone", "project"], "phone")).toEqual(["email", "project"]);
  });

  it("元の配列を変更しない", () => {
    const currentIds = ["email"];

    toggleSelectedId(currentIds, "phone");

    expect(currentIds).toEqual(["email"]);
  });

  it("検出結果から初期選択IDを作る", () => {
    expect(createInitialSelectedFindingIds([finding("email"), finding("phone")])).toEqual(["email", "phone"]);
  });
});
