import { describe, expect, it } from "vitest";
import {
  detectSensitiveText,
  maskSensitiveText,
  mergeFindings,
  type Finding
} from "../src";

function firstRuleId(input: string): string | undefined {
  return detectSensitiveText(input).findings[0]?.ruleId;
}

describe("detectSensitiveText", () => {
  it("メールアドレスを検出する", () => {
    const result = detectSensitiveText("連絡先は taro@example.com です。");

    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]?.ruleId).toBe("email");
    expect(result.maskedText).toContain("[EMAIL_1]");
  });

  it("日本の電話番号を検出する", () => {
    const result = detectSensitiveText("電話番号は 090-1234-5678 です。");

    expect(result.findings[0]?.ruleId).toBe("phone");
    expect(result.maskedText).toContain("[PHONE_1]");
  });

  it("JWTを検出する", () => {
    const token = "aaaaaaaaaa.bbbbbbbbbb.cccccccccc";

    expect(firstRuleId(token)).toBe("jwt");
  });

  it("AWS Access Key風文字列を検出する", () => {
    expect(firstRuleId("AKIAIOSFODNN7EXAMPLE")).toBe("aws_access_key");
  });

  it("GitHub token風文字列を検出する", () => {
    expect(firstRuleId("ghp_dummyDummyDummyDummyDummyDummy123456")).toBe("github_token");
  });

  it("秘密鍵を検出する", () => {
    const input = [
      "-----BEGIN PRIVATE KEY-----",
      "dummy",
      "-----END PRIVATE KEY-----"
    ].join("\n");

    const result = detectSensitiveText(input);
    expect(result.findings[0]?.ruleId).toBe("private_key");
    expect(result.maskedText).toBe("[PRIVATE_KEY_1]");
  });

  it(".env形式の秘密情報を検出する", () => {
    const result = detectSensitiveText("DATABASE_URL=postgres://user:pass@example.local/db");

    expect(result.findings[0]?.ruleId).toBe("env_secret");
    expect(result.maskedText).toBe("[ENV_SECRET_1]");
  });

  it("Basic認証情報を含むURLを検出する", () => {
    const input = "https://user:password@example.com/internal/proposal";
    const result = detectSensitiveText(input);

    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]?.ruleId).toBe("basic_auth_url");
    expect(result.maskedText).toBe("[BASIC_AUTH_URL_1]");
  });

  it("URLを検出する", () => {
    const result = detectSensitiveText("参照先: https://example.com/path");

    expect(result.findings.some((finding) => finding.ruleId === "url")).toBe(true);
  });

  it("IPv4アドレスを検出する", () => {
    expect(firstRuleId("接続先は 192.168.1.10 です。")).toBe("ip_address");
  });

  it("金額を検出する", () => {
    const result = detectSensitiveText("初期費用は300万円、月額80万円です。");

    expect(result.findings.filter((finding) => finding.ruleId === "amount")).toHaveLength(2);
  });

  it("注意語を含む行を検出する", () => {
    const result = detectSensitiveText("A社向けの資料です。NDA締結前なので関係者限りです。");

    expect(result.findings[0]?.ruleId).toBe("confidential_text");
  });

  it("複数検出時にマスキングし、placeholderを連番にする", () => {
    const input = "taro@example.com と hanako@example.com に送る";
    const result = detectSensitiveText(input);

    expect(result.maskedText).toBe("[EMAIL_1] と [EMAIL_2] に送る");
    expect(result.placeholderMap.map((entry) => entry.placeholder)).toEqual(["[EMAIL_1]", "[EMAIL_2]"]);
  });

  it("検出範囲が重複した場合は高リスクを優先する", () => {
    const input = "SECRET_TOKEN=AKIAIOSFODNN7EXAMPLE";
    const result = detectSensitiveText(input);

    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]?.ruleId).toBe("env_secret");
  });

  it("空文字入力では検出しない", () => {
    const result = detectSensitiveText("");

    expect(result.findings).toEqual([]);
    expect(result.maskedText).toBe("");
  });

  it("日本語テキスト混在でも検出する", () => {
    const result = detectSensitiveText("田中太郎です。メールは taro@example.com です。");

    expect(result.summary.high).toBe(1);
    expect(result.highestRiskLevel).toBe("high");
  });

  it("Luhnチェックに通るカード番号を検出する", () => {
    const result = detectSensitiveText("カード候補 4111 1111 1111 1111");

    expect(result.findings[0]?.ruleId).toBe("credit_card");
    expect(result.maskedText).toContain("[CARD_1]");
  });
});

describe("maskSensitiveText", () => {
  it("後ろから置換してindexずれを避ける", () => {
    const input = "A taro@example.com B 090-1234-5678";
    const detection = detectSensitiveText(input);
    const result = maskSensitiveText(input, detection.findings);

    expect(result.maskedText).toBe("A [EMAIL_1] B [PHONE_1]");
  });
});

describe("mergeFindings", () => {
  it("ルール由来とLLM由来の重複を正規化する", () => {
    const ruleFinding = detectSensitiveText("taro@example.com").findings[0];
    expect(ruleFinding).toBeDefined();

    const llmFinding: Finding = {
      id: "llm:email:0:16",
      ruleId: "llm:person_name",
      source: "llm",
      label: "人名候補",
      riskLevel: "medium",
      start: 0,
      end: 16,
      text: "taro@example.com",
      placeholder: "[PERSON_1]",
      message: "文脈上の注意候補です。",
      confidence: 0.7
    };

    const merged = mergeFindings([ruleFinding as Finding], [llmFinding]);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.source).toBe("rule");
  });
});
