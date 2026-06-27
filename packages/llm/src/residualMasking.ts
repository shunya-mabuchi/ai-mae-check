import { DEFAULT_MAX_CANDIDATES } from "./constants";
import type { RiskLevel } from "@ai-mae-check/core";
import type { ContextRiskCandidate, ContextRiskCategory } from "./types";

type ResidualPrefix =
  | "PERSON"
  | "COMPANY"
  | "CUSTOMER"
  | "PROJECT"
  | "CONTRACT_INFO"
  | "HR_INFO"
  | "LEGAL_INFO"
  | "FINANCIAL_INFO"
  | "INTERNAL_INFO"
  | "CONFIDENTIAL_CONTEXT";

type ResidualCategory = Exclude<ContextRiskCategory, "other">;

export interface ResidualContextTerm {
  surface: string;
  prefix: ResidualPrefix;
  category: ResidualCategory;
  label: string;
  reason: string;
  riskLevel: RiskLevel;
  confidence: number;
}

const honorificNamePattern = /[\p{Script=Han}々〆ヵヶ]{1,6}(?:様|さん|氏|先生|くん|ちゃん)/gu;
const selfIntroductionNamePattern = /(?:^|[\n。！？])([\p{Script=Han}々〆ヵヶ]{2,6})です(?:。|、|\s|$)/gu;
const labeledPersonNamePattern =
  /(?:担当|参加者|レビュー|作成者|相談者|依頼者|候補者|面談者|申請者)\s*[:：]?\s*([\p{Script=Han}々〆ヵヶ]{2,6})(?=$|[\s\n、。])/gu;
const customerCompanyPattern = /[A-ZＡ-Ｚ][A-ZＡ-Ｚ0-9０-９]{0,3}社(?=向け|宛て|への|へ|との|には|に|の)/gu;
const projectNamePattern = /\bProject\s+[A-Z][A-Za-z0-9-]*(?:\s+[A-Z][A-Za-z0-9-]*){1,5}\b/g;
const organizationNameBody = "[\\p{Script=Han}\\p{Script=Katakana}A-Za-zＡ-Ｚａ-ｚ0-9０-９・ー]{2,24}?";
const corporatePrefixPattern = new RegExp(
  `(?:株式会社|有限会社|合同会社|学校法人|医療法人|社会福祉法人|一般社団法人|一般財団法人)${organizationNameBody}(?=向け|宛て|との|への|へ|の|に|です|、|。|\\s|$)`,
  "gu"
);
const corporateSuffixPattern = new RegExp(
  `${organizationNameBody}(?:株式会社|有限会社|合同会社|銀行|病院|大学|研究所)(?=向け|宛て|との|への|へ|の|に|です|、|。|\\s|$)`,
  "gu"
);
const spacedJapaneseProjectNamePattern = /\b[A-Z][A-Za-z0-9-]*(?:\s+[A-Z][A-Za-z0-9-]*){0,5}(?:計画|案件|PJ|プロジェクト)/g;
const japaneseProjectNamePattern = /[\p{Script=Han}\p{Script=Katakana}A-Za-zＡ-Ｚａ-ｚ0-9０-９・ー]{2,30}(?:計画|案件|PJ|プロジェクト)/gu;

const contextTermDefinitions: Array<{
  category: ResidualCategory;
  prefix: ResidualPrefix;
  label: string;
  reason: string;
  riskLevel: RiskLevel;
  confidence: number;
  terms: string[];
}> = [
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

const prefixByCategory: Partial<Record<ContextRiskCategory, ResidualPrefix>> = {
  person_name: "PERSON",
  company_name: "COMPANY",
  customer_name: "CUSTOMER",
  project_name: "PROJECT",
  contract_info: "CONTRACT_INFO",
  hr_info: "HR_INFO",
  legal_info: "LEGAL_INFO",
  financial_info: "FINANCIAL_INFO",
  internal_info: "INTERNAL_INFO",
  confidential_context: "CONFIDENTIAL_CONTEXT"
};

function personTerm(surface: string): ResidualContextTerm {
  return {
    surface,
    prefix: "PERSON",
    category: "person_name",
    label: "人名候補",
    reason: "敬称つきの個人名らしい表現です。外部に送る前に確認したい候補です。",
    riskLevel: "medium",
    confidence: 0.86
  };
}

function customerTerm(surface: string): ResidualContextTerm {
  return {
    surface,
    prefix: "CUSTOMER",
    category: "customer_name",
    label: "顧客名・会社名候補",
    reason: "提案先や顧客名らしい表現です。外部に送る前に確認したい候補です。",
    riskLevel: "medium",
    confidence: 0.8
  };
}

function companyTerm(surface: string): ResidualContextTerm {
  return {
    surface,
    prefix: "COMPANY",
    category: "company_name",
    label: "会社名候補",
    reason: "法人格や組織種別つきの会社名らしい表現です。外部に送る前に確認したい候補です。",
    riskLevel: "medium",
    confidence: 0.82
  };
}

function projectTerm(surface: string): ResidualContextTerm {
  return {
    surface,
    prefix: "PROJECT",
    category: "project_name",
    label: "案件名・プロジェクト名候補",
    reason: "Project形式の案件名らしい表現です。外部に送る前に確認したい候補です。",
    riskLevel: "medium",
    confidence: 0.82
  };
}

function definedContextTerm(
  surface: string,
  definition: (typeof contextTermDefinitions)[number]
): ResidualContextTerm {
  return {
    surface,
    prefix: definition.prefix,
    category: definition.category,
    label: definition.label,
    reason: definition.reason,
    riskLevel: definition.riskLevel,
    confidence: definition.confidence
  };
}

function uniqueTerms(terms: ResidualContextTerm[]): ResidualContextTerm[] {
  const seen = new Set<string>();
  const unique: ResidualContextTerm[] = [];

  for (const term of terms) {
    const key = `${term.prefix}:${term.surface}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(term);
  }

  return unique.sort((left, right) => right.surface.length - left.surface.length);
}

function normalizeSurface(surface: string): string {
  return surface.replace(/\s+/g, "").toLowerCase();
}

function isDuplicateCandidate(candidate: ContextRiskCandidate, term: ResidualContextTerm): boolean {
  const candidateSurface = normalizeSurface(candidate.surface);
  const termSurface = normalizeSurface(term.surface);

  return candidateSurface.includes(termSurface) || termSurface.includes(candidateSurface);
}

export function extractResidualContextTerms(input: string): ResidualContextTerm[] {
  const terms: ResidualContextTerm[] = [];

  for (const match of input.matchAll(honorificNamePattern)) {
    terms.push(personTerm(match[0]));
  }

  for (const match of input.matchAll(selfIntroductionNamePattern)) {
    const surface = match[1];
    if (surface) {
      terms.push(personTerm(surface));
    }
  }

  for (const match of input.matchAll(labeledPersonNamePattern)) {
    const surface = match[1];
    if (surface) {
      terms.push(personTerm(surface));
    }
  }

  for (const match of input.matchAll(customerCompanyPattern)) {
    terms.push(customerTerm(match[0]));
  }

  for (const match of input.matchAll(corporatePrefixPattern)) {
    terms.push(companyTerm(match[0]));
  }

  for (const match of input.matchAll(corporateSuffixPattern)) {
    terms.push(companyTerm(match[0]));
  }

  for (const match of input.matchAll(projectNamePattern)) {
    terms.push(projectTerm(match[0]));
  }

  for (const match of input.matchAll(spacedJapaneseProjectNamePattern)) {
    terms.push(projectTerm(match[0]));
  }

  for (const match of input.matchAll(japaneseProjectNamePattern)) {
    terms.push(projectTerm(match[0]));
  }

  for (const definition of contextTermDefinitions) {
    for (const surface of definition.terms) {
      if (input.includes(surface)) {
        terms.push(definedContextTerm(surface, definition));
      }
    }
  }

  return uniqueTerms(terms);
}

export function mergeResidualContextCandidates(
  input: string,
  candidates: ContextRiskCandidate[],
  options: { maxCandidates?: number } = {}
): ContextRiskCandidate[] {
  const maxCandidates = options.maxCandidates ?? DEFAULT_MAX_CANDIDATES;
  const merged = [...candidates];
  const counters = new Map<ResidualPrefix, number>();

  for (const candidate of candidates) {
    const prefix = prefixByCategory[candidate.category];
    if (prefix) {
      counters.set(prefix, (counters.get(prefix) ?? 0) + 1);
    }
  }

  for (const term of extractResidualContextTerms(input)) {
    if (merged.length >= maxCandidates) {
      break;
    }

    if (merged.some((candidate) => isDuplicateCandidate(candidate, term))) {
      continue;
    }

    const count = (counters.get(term.prefix) ?? 0) + 1;
    counters.set(term.prefix, count);
    merged.push({
      id: `local-context-${term.category}-${count}`,
      category: term.category,
      surface: term.surface,
      label: term.label,
      reason: term.reason,
      riskLevel: term.riskLevel,
      suggestedPlaceholder: `[${term.prefix}_${count}]`,
      confidence: term.confidence
    });
  }

  return merged;
}
