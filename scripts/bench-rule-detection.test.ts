import { performance } from "node:perf_hooks";
import { describe, expect, it } from "vitest";
import { detectSensitiveText } from "../packages/core/src";

const iterations = 80;

const dummyBlock = [
  "田中太郎です。メールは taro@example.com、電話番号は 090-1234-5678 です。",
  "A社向けの提案資料について、NDA締結前なので関係者限りで確認してください。",
  "初期費用は300万円、月額80万円で進める予定です。",
  "AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE",
  "GITHUB_TOKEN=ghp_dummyDummyDummyDummyDummyDummy123456",
  "社内確認URL: https://user:password@example.com/internal/proposal"
].join("\n");

const cases = [
  {
    name: "2k dummy text",
    input: dummyBlock.repeat(Math.ceil(2000 / dummyBlock.length)).slice(0, 2000)
  },
  {
    name: "10k dummy text",
    input: dummyBlock.repeat(Math.ceil(10000 / dummyBlock.length)).slice(0, 10000)
  }
];

function percentile(values: number[], ratio: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1);
  return sorted[index] ?? 0;
}

function formatMs(value: number): string {
  return `${value.toFixed(2)}ms`;
}

describe("rule detection local benchmark", () => {
  for (const benchCase of cases) {
    it(`prints timing for ${benchCase.name}`, () => {
      const durations: number[] = [];
      let findings = 0;

      for (let index = 0; index < iterations; index += 1) {
        const startedAt = performance.now();
        const result = detectSensitiveText(benchCase.input);
        durations.push(performance.now() - startedAt);
        findings = result.summary.total;
      }

      const average = durations.reduce((sum, value) => sum + value, 0) / durations.length;
      const p95 = percentile(durations, 0.95);

      console.info(`${benchCase.name}: avg=${formatMs(average)} p95=${formatMs(p95)} findings=${findings}`);
      expect(findings).toBeGreaterThan(0);
    });
  }
});
