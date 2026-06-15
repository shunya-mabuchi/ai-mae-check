import type { RiskLevel } from "@ai-mae-check/core";

export const sampleText = `田中太郎です。メールは taro@example.com、電話番号は 090-1234-5678 です。

A社向けの提案資料について、NDA締結前なので関係者限りで確認してください。
初期費用は300万円、月額80万円で進める予定です。

AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
GITHUB_TOKEN=ghp_dummyDummyDummyDummyDummyDummy123456

社内確認URL:
https://user:password@example.com/internal/proposal

この内容をChatGPTで要約したいです。`;

export const riskLabel: Record<RiskLevel, string> = {
  critical: "重大",
  high: "高",
  medium: "中",
  low: "低"
};

export const riskTone: Record<RiskLevel, string> = {
  critical: "border-red-300 bg-red-50 text-red-800",
  high: "border-rose-200 bg-rose-50 text-rose-700",
  medium: "border-amber-200 bg-amber-50 text-amber-800",
  low: "border-slate-200 bg-slate-100 text-slate-700"
};

export const riskMeterTone: Record<RiskLevel, string> = {
  critical: "bg-red-600",
  high: "bg-rose-500",
  medium: "bg-amber-500",
  low: "bg-slate-400"
};

export type LlmStatus = "idle" | "loading" | "analyzing" | "done" | "empty" | "error";

export const initialLlmMessage = "AI文脈チェックは手動で実行できます。";
