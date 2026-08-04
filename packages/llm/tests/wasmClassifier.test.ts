import { describe, expect, it } from "vitest";
import {
  createWasmContextCandidates,
  getWasmContextPrototypeTexts,
  splitWasmContextSegments
} from "../src";

function unitVector(index: number, size = 6): number[] {
  return Array.from({ length: size }, (_, current) => (current === index ? 1 : 0));
}

describe("CPU/WASM文脈分類", () => {
  it("日本語の文と改行を短い解析単位へ分割する", () => {
    expect(
      splitWasmContextSegments(
        "候補者の評価を共有します。\n正式発表前の内容です。短い"
      )
    ).toEqual([
      { surface: "候補者の評価を共有します。" },
      { surface: "正式発表前の内容です。" }
    ]);
  });

  it("6種類の業務文脈プロトタイプを公開する", () => {
    const prototypes = getWasmContextPrototypeTexts();

    expect(prototypes).toHaveLength(6);
    expect(prototypes.every((prototype) => prototype.startsWith("トピック: "))).toBe(true);
  });

  it("最も近い業務文脈を候補へ変換し、既存の人名候補も統合する", () => {
    const input = "候補者の山田花子さんについて、最終面談後の評価を共有します。";
    const segments = splitWasmContextSegments(input);
    const candidates = createWasmContextCandidates({
      input,
      segments,
      segmentEmbeddings: [unitVector(1)],
      prototypeEmbeddings: Array.from({ length: 6 }, (_, index) => unitVector(index)),
      confidenceThreshold: 0.82
    });

    expect(candidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: "hr_info",
          surface: input,
          label: "採用・人事情報候補"
        }),
        expect.objectContaining({
          category: "person_name",
          surface: "山田花子さん"
        })
      ])
    );
  });

  it("閾値未満の意味分類は追加しない", () => {
    const input = "一般公開済みの製品紹介文を整えてください。";
    const candidates = createWasmContextCandidates({
      input,
      segments: [{ surface: input }],
      segmentEmbeddings: [[0.2, 0.2, 0.2, 0.2, 0.2, 0.2]],
      prototypeEmbeddings: Array.from({ length: 6 }, (_, index) => unitVector(index)),
      confidenceThreshold: 0.9
    });

    expect(candidates).toEqual([]);
  });

  it("上位カテゴリの差が小さい曖昧な意味分類は追加しない", () => {
    const input = "公開済みの一般的な案内文を整えてください。";
    const candidates = createWasmContextCandidates({
      input,
      segments: [{ surface: input }],
      segmentEmbeddings: [[0.71, 0.7, 0, 0, 0, 0]],
      prototypeEmbeddings: Array.from({ length: 6 }, (_, index) => unitVector(index)),
      confidenceThreshold: 0.6,
      includeResidualCandidates: false
    });

    expect(candidates).toEqual([]);
  });
});
