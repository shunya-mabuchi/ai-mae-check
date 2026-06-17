import { regexFindings } from "./ruleHelpers";
import {
  confidentialLineFindings,
  creditCardFindings,
  internalUrlFindings,
  phoneFindings
} from "./specializedDetectors";
import type { DetectorRule } from "./types";

const rules: DetectorRule[] = [
  {
    id: "email",
    label: "メールアドレス",
    riskLevel: "high",
    enabled: true,
    createFindings: (input) => regexFindings(input, rulesById.email!, /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi)
  },
  {
    id: "phone",
    label: "日本の電話番号",
    riskLevel: "high",
    enabled: true,
    createFindings: (input) => phoneFindings(input, rulesById.phone!)
  },
  {
    id: "jwt",
    label: "JWT",
    riskLevel: "high",
    enabled: true,
    createFindings: (input) => regexFindings(input, rulesById.jwt!, /\b[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g)
  },
  {
    id: "aws_access_key",
    label: "AWS Access Key風文字列",
    riskLevel: "high",
    enabled: true,
    createFindings: (input) => regexFindings(input, rulesById.aws_access_key!, /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g)
  },
  {
    id: "github_token",
    label: "GitHub token風文字列",
    riskLevel: "high",
    enabled: true,
    createFindings: (input) =>
      regexFindings(input, rulesById.github_token!, /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{20,}\b|\bgithub_pat_[A-Za-z0-9_]{20,}\b/g)
  },
  {
    id: "private_key",
    label: "秘密鍵",
    riskLevel: "high",
    enabled: true,
    createFindings: (input) =>
      regexFindings(
        input,
        rulesById.private_key!,
        /-----BEGIN (?:RSA |OPENSSH |EC |DSA |)?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |OPENSSH |EC |DSA |)?PRIVATE KEY-----/g
      )
  },
  {
    id: "env_secret",
    label: ".env形式の秘密情報",
    riskLevel: "high",
    enabled: true,
    createFindings: (input) =>
      regexFindings(
        input,
        rulesById.env_secret!,
        /^[A-Z0-9_]*(?:SECRET|TOKEN|API_KEY|PASSWORD|PASS|ACCESS_KEY|PRIVATE_KEY|CLIENT_SECRET|DATABASE_URL)[A-Z0-9_]*\s*=\s*.+$/gim
      )
  },
  {
    id: "basic_auth_url",
    label: "Basic認証情報を含むURL",
    riskLevel: "high",
    enabled: true,
    createFindings: (input) => regexFindings(input, rulesById.basic_auth_url!, /\bhttps?:\/\/[^\s:@/]+:[^\s@/]+@[^\s<>"'）)]+/gi)
  },
  {
    id: "credit_card",
    label: "クレジットカード風番号",
    riskLevel: "high",
    enabled: true,
    createFindings: (input) => creditCardFindings(input, rulesById.credit_card!)
  },
  {
    id: "url",
    label: "URL",
    riskLevel: "medium",
    enabled: true,
    createFindings: (input) => regexFindings(input, rulesById.url!, /\bhttps?:\/\/[^\s<>"'）)]+/gi)
  },
  {
    id: "ip_address",
    label: "IPv4アドレス",
    riskLevel: "medium",
    enabled: true,
    createFindings: (input) =>
      regexFindings(input, rulesById.ip_address!, /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g)
  },
  {
    id: "amount",
    label: "金額",
    riskLevel: "medium",
    enabled: true,
    createFindings: (input) =>
      regexFindings(input, rulesById.amount!, /(?:月額\s*)?(?:¥|￥)\s?\d{1,3}(?:,\d{3})*(?:\.\d+)?|(?:月額\s*)?\d{1,3}(?:,\d{3})*(?:万円|円)|(?:月額\s*)?\d+(?:\.\d+)?万円/g)
  },
  {
    id: "confidential_text",
    label: "社外秘・注意語を含む文",
    riskLevel: "medium",
    enabled: true,
    createFindings: (input) => confidentialLineFindings(input, rulesById.confidential_text!)
  },
  {
    id: "internal_url",
    label: "社内URLっぽいもの",
    riskLevel: "medium",
    enabled: true,
    createFindings: (input) => internalUrlFindings(input, rulesById.internal_url!)
  },
  {
    id: "date",
    label: "日付",
    riskLevel: "low",
    enabled: true,
    createFindings: (input) => regexFindings(input, rulesById.date!, /\b\d{4}[/. -]\d{1,2}[/. -]\d{1,2}\b|(?:\d{4}年)?\d{1,2}月\d{1,2}日/g)
  },
  {
    id: "postal_code",
    label: "郵便番号",
    riskLevel: "low",
    enabled: true,
    createFindings: (input) => regexFindings(input, rulesById.postal_code!, /\b\d{3}-\d{4}\b/g)
  },
  {
    id: "long_id",
    label: "長いID風文字列",
    riskLevel: "low",
    enabled: true,
    createFindings: (input) => regexFindings(input, rulesById.long_id!, /\b(?=[A-Za-z0-9]*[A-Za-z])(?=[A-Za-z0-9]*\d)[A-Za-z0-9]{16,}\b/g)
  }
];

const rulesById = Object.fromEntries(rules.map((rule) => [rule.id, rule])) as Record<string, DetectorRule>;

export const detectorRules: DetectorRule[] = rules;
