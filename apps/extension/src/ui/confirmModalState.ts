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
import { decisionRiskLabels, findingRiskLabels } from "../lib/riskLabels";

export interface CategoryGroup {
  category: DlpCategory;
  label: string;
  count: number;
  riskLevel: RiskLevel;
  locked: boolean;
  findingIds: string[];
  findings: Finding[];
}

export interface ConfirmModalFooterState {
  submitButtonText: string;
  submitButtonDisabled: boolean;
}

export interface ConfirmModalFooterStateOptions {
  policy: Pick<DlpPolicyDecision, "canSendRaw">;
  groups: CategoryGroup[];
  findings: Finding[];
  selectedFindingIds: Set<string>;
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

export const riskLabels: Record<RiskLevel, string> = findingRiskLabels;
export const decisionLabels: Record<RiskDecisionLevel, string> = decisionRiskLabels;

const riskRank: Record<RiskLevel, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4
};

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

export function updateCategorySelection(selectedFindingIds: Set<string>, findingIds: string[], selected: boolean): void {
  for (const id of findingIds) {
    if (selected) {
      selectedFindingIds.add(id);
    } else {
      selectedFindingIds.delete(id);
    }
  }
}

export function createConfirmedText(
  inputText: string,
  findings: Finding[],
  selectedFindingIds: Set<string>,
  mode: TransformMode = "generalize"
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

export function createConfirmModalFooterState(options: ConfirmModalFooterStateOptions): ConfirmModalFooterState {
  const currentSelected = selectedFindings(options.findings, options.selectedFindingIds);

  return {
    submitButtonText: options.policy.canSendRaw && currentSelected.length === 0 ? "そのまま送信" : "安全化して送信",
    submitButtonDisabled: !canSubmitSelection(options.groups, options.selectedFindingIds)
  };
}
