import { describe, expect, it } from "vitest";
import { convertContextCandidatesToFindings, createNerContextCandidates } from "../src";

describe("固有表現抽出候補", () => {
  it("連続する人名トークンを入力上の正確な範囲へ統合する", () => {
    const input = "担当は山田 花子さんです。";
    const candidates = createNerContextCandidates(input, [
      { entity: "PER", score: 0.94, word: "山田", index: 1, start: 3, end: 5 },
      { entity: "PER", score: 0.92, word: "花子", index: 2, start: 6, end: 8 }
    ]);

    expect(candidates).toEqual([
      expect.objectContaining({
        category: "person_name",
        surface: "山田 花子",
        start: 3,
        end: 8,
        suggestedPlaceholder: "[PERSON_1]"
      })
    ]);
  });

  it("組織、地名、施設、製品、イベントのラベルを候補へ変換する", () => {
    const input = "未来銀行は浜松市の中央研究所でNova端末を技術展示会に出す。";
    const surfaces = ["未来銀行", "浜松市", "中央研究所", "Nova端末", "技術展示会"];
    const labels = ["ORG", "LOC", "INS", "PRD", "EVT"];
    const tokens = surfaces.map((surface, index) => {
      const start = input.indexOf(surface);
      return { entity: labels[index] ?? "O", score: 0.9, word: surface, index, start, end: start + surface.length };
    });

    expect(createNerContextCandidates(input, tokens).map((candidate) => candidate.category)).toEqual([
      "company_name",
      "location_name",
      "facility_name",
      "product_name",
      "event_name"
    ]);
  });

  it("Oラベル、低confidence、範囲不正の出力を捨てる", () => {
    const input = "山田花子";
    expect(createNerContextCandidates(input, [
      { entity: "O", score: 0.99, word: input, index: 1, start: 0, end: 4 },
      { entity: "PER", score: 0.5, word: input, index: 2, start: 0, end: 4 },
      { entity: "PER", score: 0.99, word: input, index: 3, start: 0, end: 99 }
    ])).toEqual([]);
  });

  it("種類の異なる組織ラベルを一つの候補へ結合しない", () => {
    const input = "政党 研究所";
    const candidates = createNerContextCandidates(input, [
      { entity: "ORG-P", score: 0.9, word: "政党", index: 1, start: 0, end: 2 },
      { entity: "ORG-O", score: 0.9, word: "研究所", index: 2, start: 3, end: 6 }
    ]);

    expect(candidates.map((candidate) => candidate.surface)).toEqual(["政党", "研究所"]);
  });

  it("明示された位置だけをFindingへ変換する", () => {
    const input = "山田花子さんと山田花子さん";
    const secondStart = input.lastIndexOf("山田花子");
    const candidates = createNerContextCandidates(input, [
      { entity: "PER", score: 0.95, word: "山田花子", index: 1, start: secondStart, end: secondStart + 4 }
    ]);
    const findings = convertContextCandidatesToFindings(input, candidates);

    expect(findings).toHaveLength(1);
    expect(findings[0]?.start).toBe(secondStart);
  });
});
