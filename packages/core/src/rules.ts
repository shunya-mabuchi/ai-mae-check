import type { DetectorRule, Finding, RiskLevel } from "./types";

const riskMessage: Record<RiskLevel, string> = {
  critical: "外部へ送る前に必ず安全化したい情報です。",
  high: "外部へ送る前に強く確認したい情報です。",
  medium: "文脈によっては注意が必要な情報です。",
  low: "必要に応じて確認したい情報です。"
};

const placeholderByRuleId: Record<string, string> = {
  email: "EMAIL",
  phone: "PHONE",
  jwt: "JWT",
  aws_access_key: "AWS_KEY",
  github_token: "GITHUB_TOKEN",
  private_key: "PRIVATE_KEY",
  env_secret: "ENV_SECRET",
  basic_auth_url: "BASIC_AUTH_URL",
  credit_card: "CARD",
  url: "URL",
  ip_address: "IP_ADDRESS",
  amount: "AMOUNT",
  confidential_text: "CONFIDENTIAL_TEXT",
  internal_url: "INTERNAL_URL",
  date: "DATE",
  postal_code: "POSTAL_CODE",
  long_id: "ID"
};

function createFinding(
  input: string,
  rule: Pick<DetectorRule, "id" | "label" | "riskLevel">,
  start: number,
  end: number,
  confidence = 0.95
): Finding {
  const prefix = placeholderByRuleId[rule.id] ?? rule.id.toUpperCase();
  return {
    id: `rule:${rule.id}:${start}:${end}`,
    ruleId: rule.id,
    source: "rule",
    label: rule.label,
    riskLevel: rule.riskLevel,
    start,
    end,
    text: input.slice(start, end),
    placeholder: `[${prefix}_1]`,
    message: riskMessage[rule.riskLevel],
    confidence
  };
}

function regexFindings(input: string, rule: DetectorRule, pattern: RegExp): Finding[] {
  const findings: Finding[] = [];
  pattern.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(input)) !== null) {
    const text = match[0];
    if (text.length === 0) {
      pattern.lastIndex += 1;
      continue;
    }

    const start = match.index;
    findings.push(createFinding(input, rule, start, start + text.length));
  }

  return findings;
}

function luhnCheck(value: string): boolean {
  let sum = 0;
  let shouldDouble = false;

  for (let index = value.length - 1; index >= 0; index -= 1) {
    const digit = Number(value[index]);
    if (!Number.isInteger(digit)) {
      return false;
    }

    let candidate = digit;
    if (shouldDouble) {
      candidate *= 2;
      if (candidate > 9) {
        candidate -= 9;
      }
    }

    sum += candidate;
    shouldDouble = !shouldDouble;
  }

  return sum > 0 && sum % 10 === 0;
}

function creditCardFindings(input: string, rule: DetectorRule): Finding[] {
  const candidates = regexFindings(input, rule, /\b(?:\d[ -]?){13,19}\b/g);
  return candidates.filter((finding) => {
    const digits = finding.text.replace(/\D/g, "");
    return digits.length >= 13 && digits.length <= 19 && luhnCheck(digits);
  });
}

function confidentialLineFindings(input: string, rule: DetectorRule): Finding[] {
  const findings: Finding[] = [];
  const keywordPattern = /社外秘|秘密|confidential|取扱注意|関係者限り|NDA|未公開|口外禁止/i;
  const linePattern = /[^\r\n]+/g;
  let match: RegExpExecArray | null;

  while ((match = linePattern.exec(input)) !== null) {
    const line = match[0];
    if (keywordPattern.test(line)) {
      findings.push(createFinding(input, rule, match.index, match.index + line.length, 0.9));
    }
  }

  return findings;
}

function phoneFindings(input: string, rule: DetectorRule): Finding[] {
  const candidates = regexFindings(input, rule, /(?<!\d)0\d{1,4}[-\s]?\d{1,4}[-\s]?\d{3,4}(?!\d)/g);
  return candidates.filter((finding) => {
    const digits = finding.text.replace(/\D/g, "");
    return digits.length >= 10 && digits.length <= 11;
  });
}

function internalUrlFindings(input: string, rule: DetectorRule): Finding[] {
  const findings: Finding[] = [];
  const urlPattern = /\bhttps?:\/\/[^\s<>"'）)]+/gi;
  const domainPattern =
    /\b(?:localhost|[a-z0-9.-]*(?:intranet|internal|corp|staging|dev|test|local)[a-z0-9.-]*(?::\d+)?(?:\/[^\s<>"'）)]*)?)/gi;
  const markerPattern = /localhost|intranet|internal|corp|staging|dev|test|local/i;

  for (const finding of regexFindings(input, rule, urlPattern)) {
    if (markerPattern.test(finding.text)) {
      findings.push(finding);
    }
  }

  for (const finding of regexFindings(input, rule, domainPattern)) {
    const value = finding.text;
    if (value.length >= 4 && markerPattern.test(value)) {
      findings.push(finding);
    }
  }

  return findings;
}

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
