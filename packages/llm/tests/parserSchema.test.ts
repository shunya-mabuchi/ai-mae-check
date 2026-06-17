import { describe, expect, it } from "vitest";
import {
  clampConfidence,
  contextAnalysisPreferredKeys,
  getContextAnalysisCandidateValues,
  getContextAnalysisSummary,
  isContextAnalysisRecord,
  readCandidateString,
  readCandidateValue,
  toContextRiskCategory,
  toContextRiskLevel
} from "../src/parserSchema";

describe("parserSchema", () => {
  it("JSON抽出で優先したい候補キーと要約キーを公開する", () => {
    expect(contextAnalysisPreferredKeys).toContain("candidates");
    expect(contextAnalysisPreferredKeys).toContain("候補");
    expect(contextAnalysisPreferredKeys).toContain("summary");
    expect(contextAnalysisPreferredKeys).toContain("要約");
  });

  it("トップレベル配列と日本語候補キーから候補配列を取り出す", () => {
    const arrayCandidate = [{ surface: "A社" }];
    const japaneseKeyCandidate = [{ 該当テキスト: "佐藤様" }];

    expect(getContextAnalysisCandidateValues(arrayCandidate)).toBe(arrayCandidate);
    expect(getContextAnalysisCandidateValues({ 候補: japaneseKeyCandidate })).toBe(japaneseKeyCandidate);
    expect(getContextAnalysisCandidateValues({ 候補: "配列ではない値" })).toEqual([]);
  });

  it("日本語要約キーをtrimして読み取る", () => {
    expect(getContextAnalysisSummary({ 要約: " 人名候補があります。 " })).toBe("人名候補があります。");
    expect(getContextAnalysisSummary([])).toBe("");
  });

  it("日本語候補フィールドと別名を文脈リスク候補の値へ変換する", () => {
    const record = {
      カテゴリ: "人名候補",
      該当テキスト: "佐藤様",
      ラベル: "人名候補",
      理由: "敬称付きの個人名らしい表現です。",
      危険度: "中",
      プレースホルダー: "[PERSON_1]",
      信頼度: "0.87"
    };

    expect(isContextAnalysisRecord(record)).toBe(true);
    expect(readCandidateString(record, "surface")).toBe("佐藤様");
    expect(readCandidateString(record, "label")).toBe("人名候補");
    expect(readCandidateString(record, "reason")).toBe("敬称付きの個人名らしい表現です。");
    expect(readCandidateString(record, "suggestedPlaceholder")).toBe("[PERSON_1]");
    expect(toContextRiskCategory(readCandidateValue(record, "category"))).toBe("person_name");
    expect(toContextRiskLevel(readCandidateValue(record, "riskLevel"))).toBe("medium");
    expect(clampConfidence(readCandidateValue(record, "confidence"))).toBe(0.87);
  });

  it("LLM候補のcriticalは既存挙動どおりlowへ丸める", () => {
    expect(toContextRiskLevel("critical")).toBe("low");
  });
});
