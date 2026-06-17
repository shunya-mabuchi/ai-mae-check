import { createRuleFinding, luhnCheck, regexFindings } from "./ruleHelpers";
import type { DetectorRule, Finding } from "./types";

export function creditCardFindings(input: string, rule: DetectorRule): Finding[] {
  const candidates = regexFindings(input, rule, /\b(?:\d[ -]?){13,19}\b/g);
  return candidates.filter((finding) => {
    const digits = finding.text.replace(/\D/g, "");
    return digits.length >= 13 && digits.length <= 19 && luhnCheck(digits);
  });
}

export function confidentialLineFindings(input: string, rule: DetectorRule): Finding[] {
  const findings: Finding[] = [];
  const keywordPattern = /社外秘|秘密|confidential|取扱注意|関係者限り|NDA|未公開|口外禁止/i;
  const linePattern = /[^\r\n]+/g;
  let match: RegExpExecArray | null;

  while ((match = linePattern.exec(input)) !== null) {
    const line = match[0];
    if (keywordPattern.test(line)) {
      findings.push(createRuleFinding(input, rule, match.index, match.index + line.length, 0.9));
    }
  }

  return findings;
}

export function phoneFindings(input: string, rule: DetectorRule): Finding[] {
  const candidates = regexFindings(input, rule, /(?<!\d)0\d{1,4}[-\s]?\d{1,4}[-\s]?\d{3,4}(?!\d)/g);
  return candidates.filter((finding) => {
    const digits = finding.text.replace(/\D/g, "");
    return digits.length >= 10 && digits.length <= 11;
  });
}

export function internalUrlFindings(input: string, rule: DetectorRule): Finding[] {
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
