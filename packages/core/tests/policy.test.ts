import { describe, expect, it } from "vitest";
import { detectSensitiveText, evaluateDlpPolicy, type Finding } from "../src";

function finding(overrides: Partial<Finding> = {}): Finding {
  return {
    id: "test:finding:0:1",
    ruleId: "test",
    source: "llm",
    label: "テスト候補",
    riskLevel: "low",
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
  it("空の検出結果はnone severityで許可する", () => {
    const decision = evaluateDlpPolicy([]);

    expect(decision).toMatchObject({
      action: "allow",
      severity: "none",
      requiredFindingIds: [],
      optionalFindingIds: [],
      canSendRaw: true,
      requiresSanitization: false
    });
  });

  it("safeとlowはそのまま送信可能にする", () => {
    const decision = evaluateDlpPolicy([finding({ id: "date:1" })]);

    expect(decision.action).toBe("allow");
    expect(decision.severity).toBe("low");
    expect(decision.reason).toBe("そのまま送信できる範囲の判定です。");
    expect(decision.requiredFindingIds).toEqual([]);
    expect(decision.optionalFindingIds).toEqual(["date:1"]);
    expect(decision.canSendRaw).toBe(true);
    expect(decision.requiresSanitization).toBe(false);
  });

  it("mediumは詳細確認を要求する", () => {
    const decision = evaluateDlpPolicy([
      finding({ id: "financial:1", ruleId: "llm:financial_info", riskLevel: "medium", category: "financial", label: "金融情報候補" })
    ]);

    expect(decision.action).toBe("confirm");
    expect(decision.severity).toBe("medium");
    expect(decision.reason).toBe("送信前に詳細確認が必要な候補があります。");
    expect(decision.requiredFindingIds).toEqual([]);
    expect(decision.optionalFindingIds).toEqual(["financial:1"]);
    expect(decision.canSendRaw).toBe(true);
    expect(decision.requiresSanitization).toBe(false);
  });

  it("highまたはcriticalのFindingは安全化必須にする", () => {
    const decision = evaluateDlpPolicy([
      finding({ id: "email:1", ruleId: "email", riskLevel: "high", category: "email", label: "メールアドレス" }),
      finding({ id: "date:1", ruleId: "date", riskLevel: "low", category: "date", label: "日付" })
    ]);

    expect(decision.action).toBe("sanitize_required");
    expect(decision.severity).toBe("high");
    expect(decision.requiredFindingIds).toEqual(["email:1"]);
    expect(decision.optionalFindingIds).toEqual(["date:1"]);
    expect(decision.canSendRaw).toBe(false);
    expect(decision.requiresSanitization).toBe(true);
  });

  it("criticalは独立したblockではなく安全化必須の最重度として扱う", () => {
    const decision = evaluateDlpPolicy([
      finding({
        id: "root-secret:1",
        ruleId: "production_root_secret",
        riskLevel: "critical",
        category: "secret",
        label: "本番秘密鍵"
      }),
      finding({ id: "url:1", ruleId: "url", riskLevel: "medium", category: "url", label: "URL" })
    ]);

    expect(decision.action).toBe("sanitize_required");
    expect(decision.severity).toBe("critical");
    expect(decision.requiredFindingIds).toEqual(["root-secret:1"]);
    expect(decision.optionalFindingIds).toEqual(["url:1"]);
    expect(decision.canSendRaw).toBe(false);
    expect(decision.requiresSanitization).toBe(true);
  });

  it("PolicyDecisionのactionは3種類に留め、blockへ分岐させない", () => {
    const samples = [
      evaluateDlpPolicy([]),
      evaluateDlpPolicy([finding({ id: "legal:1", riskLevel: "medium", category: "legal" })]),
      evaluateDlpPolicy([finding({ id: "critical:1", riskLevel: "critical", category: "secret" })])
    ];

    expect(samples.map((decision) => decision.action)).toEqual(["allow", "confirm", "sanitize_required"]);
  });

  it("秘密情報保護の対象は安全化必須にする", () => {
    const detection = detectSensitiveText("AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE");
    const decision = evaluateDlpPolicy(detection.findings);

    expect(decision.action).toBe("sanitize_required");
    expect(decision.severity).toMatch(/^(medium|high|critical)$/);
    expect(decision.reason).toBe("高リスクまたは秘密情報保護の対象が含まれるため、安全化が必要です。");
    expect(decision.requiredFindingIds).toEqual(detection.findings.map((item) => item.id));
    expect(decision.optionalFindingIds).toEqual([]);
    expect(decision.canSendRaw).toBe(false);
    expect(decision.requiresSanitization).toBe(true);
  });

  it("追加のtoken風ルールも秘密情報保護の対象にする", () => {
    const token = ["sk", "dummyDummyDummyDummy123456"].join("-");
    const detection = detectSensitiveText(token);
    const decision = evaluateDlpPolicy(detection.findings);

    expect(detection.findings[0]?.ruleId).toBe("openai_api_key");
    expect(decision.action).toBe("sanitize_required");
    expect(decision.requiredFindingIds).toEqual([detection.findings[0]?.id]);
    expect(decision.canSendRaw).toBe(false);
  });

  it("複合スコアで安全化必須になった場合は全Findingを必須対象にする", () => {
    const findings = [
      finding({ id: "financial:1", ruleId: "llm:financial_info", category: "financial", label: "金融情報候補" }),
      finding({ id: "legal:1", ruleId: "llm:legal_info", category: "legal", label: "法務情報候補" }),
      finding({ id: "medical:1", ruleId: "llm:medical_info", category: "medical", label: "医療情報候補" })
    ];
    const decision = evaluateDlpPolicy(findings);

    expect(decision.action).toBe("sanitize_required");
    expect(decision.severity).toBe("high");
    expect(decision.requiredFindingIds).toEqual(["financial:1", "legal:1", "medical:1"]);
    expect(decision.optionalFindingIds).toEqual([]);
  });
});
