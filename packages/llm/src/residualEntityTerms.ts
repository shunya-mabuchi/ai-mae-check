import type { ResidualContextTerm } from "./residualTypes";

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

export function extractResidualEntityTerms(input: string): ResidualContextTerm[] {
  const terms: ResidualContextTerm[] = [];

  for (const match of input.matchAll(honorificNamePattern)) {
    terms.push(personTerm(match[0]));
  }
  for (const match of input.matchAll(selfIntroductionNamePattern)) {
    if (match[1]) terms.push(personTerm(match[1]));
  }
  for (const match of input.matchAll(labeledPersonNamePattern)) {
    if (match[1]) terms.push(personTerm(match[1]));
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

  return terms;
}
