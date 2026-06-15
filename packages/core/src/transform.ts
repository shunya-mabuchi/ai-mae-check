import { createPlaceholderMap, maskSensitiveText, normalizeFindings } from "./mask";
import { categoryForFinding } from "./riskScore";
import type { DlpCategory, Finding, TextTransformResult, TransformMode } from "./types";

const generalizedPlaceholderByCategory: Record<DlpCategory, string> = {
  person: "[人名]",
  organization: "[組織名]",
  address: "[住所]",
  email: "[メールアドレス]",
  phone: "[電話番号]",
  id: "[ID]",
  secret: "[秘密情報]",
  financial: "[金額情報]",
  medical: "[医療情報]",
  legal: "[法務情報]",
  date: "[日付]",
  url: "[URL]",
  file: "[ファイル情報]",
  other: "[注意情報]"
};

function generalizeFindings(findings: Finding[]): Finding[] {
  return normalizeFindings(findings).map((finding) => ({
    ...finding,
    placeholder: generalizedPlaceholderByCategory[categoryForFinding(finding)]
  }));
}

function replaceFromEnd(input: string, findings: Finding[]): string {
  let result = input;

  for (const finding of [...findings].sort((left, right) => right.start - left.start)) {
    result = `${result.slice(0, finding.start)}${finding.placeholder}${result.slice(finding.end)}`;
  }

  return result;
}

export function transformText(input: string, findings: Finding[], mode: TransformMode): TextTransformResult {
  if (mode === "mask") {
    const maskResult = maskSensitiveText(input, findings);
    return {
      mode,
      transformedText: maskResult.maskedText,
      placeholderMap: maskResult.placeholderMap,
      findings: maskResult.findings,
      requiresLlm: false
    };
  }

  if (mode === "minimize") {
    return {
      mode,
      transformedText: input,
      placeholderMap: [],
      findings: normalizeFindings(findings),
      requiresLlm: true
    };
  }

  const generalizedFindings = generalizeFindings(findings);
  return {
    mode,
    transformedText: replaceFromEnd(input, generalizedFindings),
    placeholderMap: createPlaceholderMap(generalizedFindings),
    findings: generalizedFindings,
    requiresLlm: false
  };
}
