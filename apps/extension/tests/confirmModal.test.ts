import { describe, expect, it } from "vitest";
import { detectSensitiveText, evaluateDlpPolicy } from "@ai-mae-check/core";
import {
  canSubmitSelection,
  createCategoryGroups,
  createConfirmedText,
  transformModeOptions,
  updateCategorySelection
} from "../src/ui/confirmModalState";

describe("confirmModal helpers", () => {
  it("検出結果をカテゴリ単位にまとめる", () => {
    const detection = detectSensitiveText("メールは taro@example.com、費用は300万円です。");
    const groups = createCategoryGroups(detection.findings, evaluateDlpPolicy(detection.findings));

    expect(groups.map((group) => group.category)).toContain("email");
    expect(groups.map((group) => group.category)).toContain("financial");
  });

  it("Secret Guard対象はカテゴリをロックする", () => {
    const detection = detectSensitiveText("GITHUB_TOKEN=ghp_dummyDummyDummyDummyDummyDummy123456");
    const policy = evaluateDlpPolicy(detection.findings);
    const groups = createCategoryGroups(detection.findings, policy);

    expect(policy.requiresSanitization).toBe(true);
    expect(groups.every((group) => group.locked)).toBe(true);
    expect(canSubmitSelection(groups, new Set())).toBe(false);
  });

  it("mediumリスクは詳細確認後に素通しできる", () => {
    const detection = detectSensitiveText("初期費用は300万円です。");
    const policy = evaluateDlpPolicy(detection.findings);
    const groups = createCategoryGroups(detection.findings, policy);

    expect(policy.canSendRaw).toBe(true);
    expect(groups.every((group) => !group.locked)).toBe(true);
    expect(canSubmitSelection(groups, new Set())).toBe(true);
  });

  it("Generalizeではカテゴリ表現に置換する", () => {
    const inputText = "メールは taro@example.com です。";
    const detection = detectSensitiveText(inputText);
    const selectedIds = new Set(detection.findings.map((finding) => finding.id));

    expect(createConfirmedText(inputText, detection.findings, selectedIds, "generalize")).toBe("メールは [メールアドレス] です。");
  });

  it("変換モードはMaskとGeneralizeだけを表示する", () => {
    expect(transformModeOptions.map((option) => option.value)).toEqual(["mask", "generalize"]);
    expect(transformModeOptions.map((option) => option.title)).not.toContain("安全な依頼文に整える");
  });

  it("カテゴリ単位でfinding IDを選択・解除する", () => {
    const selectedIds = new Set(["email-1"]);

    updateCategorySelection(selectedIds, ["phone-1", "phone-2"], true);
    expect([...selectedIds]).toEqual(["email-1", "phone-1", "phone-2"]);

    updateCategorySelection(selectedIds, ["email-1", "phone-2"], false);
    expect([...selectedIds]).toEqual(["phone-1"]);
  });
});
