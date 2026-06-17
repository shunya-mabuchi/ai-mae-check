import {
  categoryForFinding,
  transformText,
  type DlpCategory,
  type DlpPolicyDecision,
  type Finding,
  type RiskDecisionLevel,
  type RiskLevel,
  type TransformMode
} from "@ai-mae-check/core";

export interface TransformModeOption {
  value: TransformMode;
  title: string;
  description: string;
}

export interface CategoryGroup {
  category: DlpCategory;
  label: string;
  count: number;
  riskLevel: RiskLevel;
  locked: boolean;
  findingIds: string[];
  findings: Finding[];
}

const categoryLabels: Record<DlpCategory, string> = {
  person: "人名",
  organization: "組織名・会社名",
  address: "住所",
  email: "メールアドレス",
  phone: "電話番号",
  id: "ID・識別子",
  secret: "秘密情報",
  financial: "金額・金融情報",
  medical: "医療・採用関連",
  legal: "契約・法務情報",
  date: "日付",
  url: "URL",
  file: "ファイル情報",
  other: "その他の注意情報"
};

export const riskLabels: Record<RiskLevel, string> = {
  critical: "重大",
  high: "高",
  medium: "中",
  low: "低"
};

export const decisionLabels: Record<RiskDecisionLevel, string> = {
  safe: "安全寄り",
  low: "低",
  medium: "中",
  high: "高",
  critical: "重大"
};

const riskRank: Record<RiskLevel, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4
};

export const transformModeOptions: TransformModeOption[] = [
  {
    value: "mask",
    title: "Mask",
    description: "検出箇所をプレースホルダーへ置き換えます。"
  },
  {
    value: "generalize",
    title: "Generalize",
    description: "カテゴリ名が分かる汎用表現へ置き換えます。"
  }
];

function highestRisk(findings: Finding[]): RiskLevel {
  return findings.reduce<RiskLevel>((highest, finding) => {
    return riskRank[finding.riskLevel] > riskRank[highest] ? finding.riskLevel : highest;
  }, "low");
}

export function createCategoryGroups(findings: Finding[], policy: DlpPolicyDecision): CategoryGroup[] {
  const byCategory = new Map<DlpCategory, Finding[]>();

  for (const finding of findings) {
    const category = categoryForFinding(finding);
    const current = byCategory.get(category) ?? [];
    current.push(finding);
    byCategory.set(category, current);
  }

  return Array.from(byCategory.entries())
    .map(([category, groupFindings]) => ({
      category,
      label: categoryLabels[category],
      count: groupFindings.length,
      riskLevel: highestRisk(groupFindings),
      locked: policy.requiresSanitization,
      findingIds: groupFindings.map((finding) => finding.id),
      findings: groupFindings
    }))
    .sort((left, right) => {
      if (left.locked !== right.locked) {
        return left.locked ? -1 : 1;
      }

      const riskDiff = riskRank[right.riskLevel] - riskRank[left.riskLevel];
      return riskDiff !== 0 ? riskDiff : left.label.localeCompare(right.label, "ja");
    });
}

export function canSubmitSelection(groups: CategoryGroup[], selectedFindingIds: Set<string>): boolean {
  return groups.every((group) => !group.locked || group.findingIds.every((id) => selectedFindingIds.has(id)));
}

export function createConfirmedText(
  inputText: string,
  findings: Finding[],
  selectedFindingIds: Set<string>,
  mode: TransformMode
): string {
  const selected = selectedFindings(findings, selectedFindingIds);

  if (selected.length === 0) {
    return inputText;
  }

  return transformText(inputText, selected, mode).transformedText;
}

export function selectedFindings(findings: Finding[], selectedFindingIds: Set<string>): Finding[] {
  return findings.filter((finding) => selectedFindingIds.has(finding.id));
}
