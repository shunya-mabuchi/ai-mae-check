import type { RiskLevel } from "@ai-mae-check/core";
import type { ContextRiskCategory } from "./types";

export type ResidualPrefix =
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

export type ResidualCategory = Extract<
  ContextRiskCategory,
  | "person_name"
  | "company_name"
  | "customer_name"
  | "project_name"
  | "contract_info"
  | "hr_info"
  | "legal_info"
  | "financial_info"
  | "internal_info"
  | "confidential_context"
>;

export interface ResidualContextTerm {
  surface: string;
  prefix: ResidualPrefix;
  category: ResidualCategory;
  label: string;
  reason: string;
  riskLevel: RiskLevel;
  confidence: number;
}
