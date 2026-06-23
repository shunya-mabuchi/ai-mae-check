import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { detectSensitiveText, evaluateDlpPolicy } from "@ai-mae-check/core";
import {
  canSubmitSelection,
  createCategoryGroups,
  createConfirmModalFooterState,
  createConfirmedText,
  updateCategorySelection
} from "../src/ui/confirmModalState";
import { confirmModalTokens } from "../src/ui/styles";

describe("confirmModal helpers", () => {
  it("keeps the AI check action label and does not restore safe-prompt copy", () => {
    const source = readFileSync(new URL("../src/ui/confirmModal.ts", import.meta.url), "utf8");

    expect(source).toContain('"AIチェック"');
    expect(source).not.toContain('"要約"');
    expect(source).not.toContain("AI文脈チェックで安全な依頼文の候補を作る");
  });

  it("splits modal rendering into focused modules", () => {
    const source = readFileSync(new URL("../src/ui/confirmModal.ts", import.meta.url), "utf8");
    const styles = readFileSync(new URL("../src/ui/styles.ts", import.meta.url), "utf8");

    expect(source).toContain('from "./confirmModalCandidateList"');
    expect(source).toContain('from "./confirmModalCategoryList"');
    expect(source).toContain('from "./confirmModalElements"');
    expect(source).toContain('from "./confirmModalFooter"');
    expect(source).toContain('from "../lib/dialogAccessibility"');
    expect(source).toContain("setupDialogAccessibility");
    expect(source).not.toContain("pasteReviewListRenderers");
    expect(source).not.toContain("pasteReviewSelection");
    expect(source).not.toContain("pasteReviewLlmRunner");
    expect(styles).not.toContain(".hm-");
    expect(styles).toContain(".review-candidate");
  });

  it("adds dialog ARIA labels and live regions to send confirmation modal elements", () => {
    const elements = readFileSync(new URL("../src/ui/confirmModalElements.ts", import.meta.url), "utf8");

    expect(elements).toContain('dialog.setAttribute("aria-label"');
    expect(elements).toContain('status.setAttribute("role", "status")');
    expect(elements).toContain('llmStatus.setAttribute("aria-live", "polite")');
    expect(elements).toContain('candidateList.setAttribute("aria-label"');
    expect(elements).toContain('button.type = "button"');
  });

  it("exports style tokens and protects disabled hover states", () => {
    const stylesSource = readFileSync(new URL("../src/ui/styles.ts", import.meta.url), "utf8");

    expect(confirmModalTokens.colors.accent).toBe("#2f7d57");
    expect(confirmModalTokens.colors.surface).toBe("#fff");
    expect(stylesSource).toContain(".amc-button:disabled:hover");
    expect(stylesSource).toContain(".amc-primary:disabled:hover");
    expect(stylesSource).toContain("background: ${colors.surface};");
    expect(stylesSource).toContain("background: ${colors.accent};");
  });

  it("groups findings by category", () => {
    const detection = detectSensitiveText("メールは taro@example.com、予算は300万円です。");
    const groups = createCategoryGroups(detection.findings, evaluateDlpPolicy(detection.findings));

    expect(groups.map((group) => group.category)).toContain("email");
    expect(groups.map((group) => group.category)).toContain("financial");
  });

  it("locks all categories when sanitization is required", () => {
    const detection = detectSensitiveText("GITHUB_TOKEN=ghp_dummyDummyDummyDummyDummyDummy123456");
    const policy = evaluateDlpPolicy(detection.findings);
    const groups = createCategoryGroups(detection.findings, policy);

    expect(policy.requiresSanitization).toBe(true);
    expect(groups.every((group) => group.locked)).toBe(true);
    expect(canSubmitSelection(groups, new Set())).toBe(false);
  });

  it("allows deselecting medium-risk categories when raw send is allowed", () => {
    const detection = detectSensitiveText("予算は300万円です。");
    const policy = evaluateDlpPolicy(detection.findings);
    const groups = createCategoryGroups(detection.findings, policy);

    expect(policy.canSendRaw).toBe(true);
    expect(groups.every((group) => !group.locked)).toBe(true);
    expect(canSubmitSelection(groups, new Set())).toBe(true);
  });

  it("creates generalized text from selected findings", () => {
    const inputText = "メールは taro@example.com です。";
    const detection = detectSensitiveText(inputText);
    const selectedIds = new Set(detection.findings.map((finding) => finding.id));

    expect(createConfirmedText(inputText, detection.findings, selectedIds)).toBe("メールは [メールアドレス] です。");
  });

  it("updates selected finding ids per category toggle", () => {
    const selectedIds = new Set(["email-1"]);

    updateCategorySelection(selectedIds, ["phone-1", "phone-2"], true);
    expect([...selectedIds]).toEqual(["email-1", "phone-1", "phone-2"]);

    updateCategorySelection(selectedIds, ["email-1", "phone-2"], false);
    expect([...selectedIds]).toEqual(["phone-1"]);
  });

  it("shows raw-send copy when nothing remains selected", () => {
    const detection = detectSensitiveText("予算は300万円です。");
    const policy = evaluateDlpPolicy(detection.findings);
    const groups = createCategoryGroups(detection.findings, policy);

    expect(
      createConfirmModalFooterState({
        policy,
        groups,
        findings: detection.findings,
        selectedFindingIds: new Set()
      })
    ).toEqual({
      submitButtonText: "そのまま送信",
      submitButtonDisabled: false
    });
  });

  it("shows safe-send copy when findings remain selected", () => {
    const detection = detectSensitiveText("予算は300万円です。");
    const policy = evaluateDlpPolicy(detection.findings);
    const groups = createCategoryGroups(detection.findings, policy);
    const selectedFindingIds = new Set(detection.findings.map((finding) => finding.id));

    expect(
      createConfirmModalFooterState({
        policy,
        groups,
        findings: detection.findings,
        selectedFindingIds
      })
    ).toEqual({
      submitButtonText: "安全化して送信",
      submitButtonDisabled: false
    });
  });

  it("disables submit when locked findings are unselected", () => {
    const detection = detectSensitiveText("GITHUB_TOKEN=ghp_dummyDummyDummyDummyDummyDummy123456");
    const policy = evaluateDlpPolicy(detection.findings);
    const groups = createCategoryGroups(detection.findings, policy);

    expect(
      createConfirmModalFooterState({
        policy,
        groups,
        findings: detection.findings,
        selectedFindingIds: new Set()
      })
    ).toEqual({
      submitButtonText: "安全化して送信",
      submitButtonDisabled: true
    });
  });
});
