import { describe, expect, it } from "vitest";
import { detectSensitiveText, evaluateDlpPolicy, type Finding } from "../src";

function finding(overrides: Partial<Finding> = {}): Finding {
  return {
    id: "test:finding:0:1",
    ruleId: "test",
    source: "llm",
    label: "テスト候補",
    riskLevel: "medium",
    category: "date",
    start: 0,
    end: 1,
    text: "x",
    placeholder: "[TEST_1]",
    message: "テスト用の候補です。",
    confidence: 1,
    ...overrides
  };
}

describe("evaluateDlpPolicy", () => {
  it("safeとlowはそのまま送信可能にする", () => {
    const decision = evaluateDlpPolicy([finding()]);

    expect(decision.action).toBe("allow");
    expect(decision.canSendRaw).toBe(true);
    expect(decision.requiresSanitization).toBe(false);
  });

  it("mediumは詳細確認を要求する", () => {
    const decision = evaluateDlpPolicy([
      finding({ id: "email:1", ruleId: "email", category: "email", label: "メールアドレス" }),
      finding({ id: "amount:1", ruleId: "amount", category: "financial", label: "金額" })
    ]);

    expect(decision.action).toBe("confirm");
    expect(decision.canSendRaw).toBe(true);
    expect(decision.requiresSanitization).toBe(false);
  });

  it("Secret Guard対象は安全化必須にする", () => {
    const detection = detectSensitiveText("AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE");
    const decision = evaluateDlpPolicy(detection.findings);

    expect(decision.action).toBe("sanitize_required");
    expect(decision.canSendRaw).toBe(false);
    expect(decision.requiresSanitization).toBe(true);
  });
});
