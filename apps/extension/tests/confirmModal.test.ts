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
    const source = readFileSync(new URL("../src/ui/SendConfirmDialog.tsx", import.meta.url), "utf8");

    expect(source).toContain("AIチェック");
    expect(source).not.toContain("要約");
    expect(source).not.toContain("AI文脈チェックで安全な依頼文の候補を作る");
  });

  it("splits modal rendering into focused modules", () => {
    const source = readFileSync(new URL("../src/ui/confirmModal.tsx", import.meta.url), "utf8");
    const controller = readFileSync(new URL("../src/ui/confirmModalController.ts", import.meta.url), "utf8");
    const dialog = readFileSync(new URL("../src/ui/SendConfirmDialog.tsx", import.meta.url), "utf8");
    const styles = readFileSync(new URL("../src/ui/styles.ts", import.meta.url), "utf8");

    expect(source).toContain('from "react-dom/client"');
    expect(source).toContain('from "../lib/shadowHost"');
    expect(source).toContain('from "./confirmModalController"');
    expect(source).toContain("createReactShadowHost(confirmModalCss)");
    expect(source).not.toContain("setupDialogAccessibility");
    expect(controller).toContain('from "./confirmModalCandidateList"');
    expect(controller).toContain('from "./confirmModalCategoryList"');
    expect(controller).toContain('from "./confirmModalFooter"');
    expect(controller).toContain("isActive");
    expect(dialog).toContain("<ModalOverlay");
    expect(dialog).toContain("<Dialog");
    expect(dialog).toContain("aria-label={title}");
    expect(dialog).toContain("useShadowDialogTabContainment");
    expect(styles).not.toContain(".hm-");
    expect(styles).toContain(".review-candidate");
  });

  it("adds React Aria dialog labels and live regions to the send confirmation modal", () => {
    const dialog = readFileSync(new URL("../src/ui/SendConfirmDialog.tsx", import.meta.url), "utf8");

    expect(dialog).toContain("<Dialog");
    expect(dialog).toContain("aria-label={title}");
    expect(dialog).toContain('role="status" aria-live="polite"');
    expect(dialog).toContain('role="group"');
    expect(dialog).toContain('type="button"');
    expect(dialog).toContain('className="amc-brand-mark-image"');
  });

  it("exports style tokens and protects disabled hover states", () => {
    const stylesSource = readFileSync(new URL("../src/ui/styles.ts", import.meta.url), "utf8");
    const sharedStylesSource = readFileSync(new URL("../src/lib/sharedModalCss.ts", import.meta.url), "utf8");
    const sharedPartsSource = readFileSync(new URL("../src/lib/sharedModalCssParts.ts", import.meta.url), "utf8");
    const combinedStylesSource = `${stylesSource}\n${sharedStylesSource}\n${sharedPartsSource}`;

    expect(confirmModalTokens.colors.accent).toBe("#0f9f69");
    expect(confirmModalTokens.colors.surface).toBe("#ffffff");
    expect(combinedStylesSource).toContain(".${prefix}-button:disabled:hover");
    expect(combinedStylesSource).toContain(".${prefix}-primary:disabled:hover");
    expect(combinedStylesSource).toContain(".${prefix}-secondary:disabled:hover");
    expect(combinedStylesSource).toContain("background: ${colors.surface};");
    expect(combinedStylesSource).toContain("background: ${colors.accent};");
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

  it("locks only required categories when high and medium risks are mixed", () => {
    const detection = detectSensitiveText("メールは taro@example.com、予算は300万円です。");
    const policy = evaluateDlpPolicy(detection.findings);
    const groups = createCategoryGroups(detection.findings, policy);

    expect(groups.find((group) => group.category === "email")?.locked).toBe(true);
    expect(groups.find((group) => group.category === "financial")?.locked).toBe(false);
  });

  it("同じカテゴリでも安全化必須と任意の検出項目を分ける", () => {
    const detection = detectSensitiveText("カード番号は 4111 1111 1111 1111、予算は300万円です。");
    const policy = evaluateDlpPolicy(detection.findings);
    const financialGroups = createCategoryGroups(detection.findings, policy).filter(
      (group) => group.category === "financial"
    );

    expect(financialGroups).toHaveLength(2);
    expect(financialGroups.find((group) => group.locked)?.findings.map((finding) => finding.ruleId)).toContain(
      "credit_card"
    );
    expect(financialGroups.find((group) => !group.locked)?.findings.map((finding) => finding.ruleId)).toContain(
      "amount"
    );
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
