import { describe, expect, it } from "vitest";
import type { DetectorRule } from "../src/types";
import {
  confidentialLineFindings,
  creditCardFindings,
  internalUrlFindings,
  phoneFindings
} from "../src/specializedDetectors";

function rule(id: string, label = id): DetectorRule {
  return {
    id,
    label,
    riskLevel: id === "confidential_text" || id === "internal_url" ? "medium" : "high",
    enabled: true,
    createFindings: () => []
  };
}

describe("specializedDetectors", () => {
  it("日本の電話番号らしい候補だけを返す", () => {
    const findings = phoneFindings("電話 090-1234-5678 / 短い番号 03-12", rule("phone", "日本の電話番号"));

    expect(findings).toHaveLength(1);
    expect(findings[0]?.text).toBe("090-1234-5678");
  });

  it("Luhnチェックに通るカード番号だけを返す", () => {
    const findings = creditCardFindings("候補 4111 1111 1111 1111 と 4111 1111 1111 1112", rule("credit_card", "クレジットカード風番号"));

    expect(findings.map((finding) => finding.text)).toEqual(["4111 1111 1111 1111"]);
  });

  it("注意語を含む行全体を返す", () => {
    const findings = confidentialLineFindings(
      "公開情報です。\nA社向け資料はNDA締結前なので関係者限りです。",
      rule("confidential_text", "社外秘・注意語を含む文")
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]?.text).toBe("A社向け資料はNDA締結前なので関係者限りです。");
    expect(findings[0]?.confidence).toBe(0.9);
  });

  it("社内URLらしいURLと重なったドメイン候補を返す", () => {
    const findings = internalUrlFindings(
      "公開 https://example.com と 社内 https://staging.example.local/path と localhost:3000",
      rule("internal_url", "社内URLっぽいもの")
    );

    expect(findings.map((finding) => finding.text)).toEqual([
      "https://staging.example.local/path",
      "staging.example.local/path",
      "localhost"
    ]);
  });
});
