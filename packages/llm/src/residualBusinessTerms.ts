import type { RiskLevel } from "@ai-mae-check/core";
import type { ResidualCategory, ResidualContextTerm, ResidualPrefix } from "./residualTypes";
import type { ContextRiskCategory } from "./types";

interface ResidualContextDefinition {
  category: ResidualCategory;
  prefix: ResidualPrefix;
  label: string;
  reason: string;
  riskLevel: RiskLevel;
  confidence: number;
  terms: string[];
}

const businessContextCategories = new Set<ContextRiskCategory>([
  "contract_info",
  "hr_info",
  "legal_info",
  "financial_info",
  "internal_info",
  "confidential_context"
]);

const contextTermDefinitions: ResidualContextDefinition[] = [
  {
    category: "contract_info",
    prefix: "CONTRACT_INFO",
    label: "契約情報候補",
    reason: "契約や見積条件に関する文脈です。外部に送る前に確認したい候補です。",
    riskLevel: "medium",
    confidence: 0.78,
    terms: ["契約更新", "NDA締結前", "見積条件", "年間契約"]
  },
  {
    category: "hr_info",
    prefix: "HR_INFO",
    label: "採用・人事情報候補",
    reason: "採用や人事評価に関する文脈です。外部に送る前に確認したい候補です。",
    riskLevel: "medium",
    confidence: 0.8,
    terms: ["最終面談評価", "最終面談後の評価メモ", "評価メモ", "年収条件", "給与条件", "退職理由", "内定前"]
  },
  {
    category: "legal_info",
    prefix: "LEGAL_INFO",
    label: "法務情報候補",
    reason: "法務確認や契約書レビューに関する文脈です。外部に送る前に確認したい候補です。",
    riskLevel: "medium",
    confidence: 0.78,
    terms: ["法務確認", "契約書レビュー", "利用規約改定", "弁護士確認"]
  },
  {
    category: "financial_info",
    prefix: "FINANCIAL_INFO",
    label: "金融・条件情報候補",
    reason: "金額条件や社内の数値条件に関する文脈です。外部に送る前に確認したい候補です。",
    riskLevel: "medium",
    confidence: 0.76,
    terms: ["粗利", "原価", "予算", "単価", "請求条件"]
  },
  {
    category: "internal_info",
    prefix: "INTERNAL_INFO",
    label: "社内情報候補",
    reason: "社内だけで扱う前提の文脈です。外部に送る前に確認したい候補です。",
    riskLevel: "medium",
    confidence: 0.78,
    terms: ["社内だけで確認", "社内限り", "役員会前"]
  },
  {
    category: "confidential_context",
    prefix: "CONFIDENTIAL_CONTEXT",
    label: "未公開・社外秘文脈候補",
    reason: "未公開または外部共有を避ける文脈です。外部に送る前に確認したい候補です。",
    riskLevel: "medium",
    confidence: 0.8,
    terms: ["発表前なので外には出さない", "正式発表前", "外には出さない", "社外共有はしない"]
  }
];

export function isBusinessContextCategory(category: ContextRiskCategory): boolean {
  return businessContextCategories.has(category);
}

export function extractResidualBusinessTerms(input: string): ResidualContextTerm[] {
  return contextTermDefinitions.flatMap((definition) =>
    definition.terms
      .filter((surface) => input.includes(surface))
      .map((surface) => ({
        surface,
        prefix: definition.prefix,
        category: definition.category,
        label: definition.label,
        reason: definition.reason,
        riskLevel: definition.riskLevel,
        confidence: definition.confidence
      }))
  );
}
