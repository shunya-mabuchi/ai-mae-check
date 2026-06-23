import { describe, expect, it } from "vitest";
import { shouldOfferContextCheck } from "../src/content/dom/contextHints";
import { buildFinding } from "./testBuilders";

describe("contextHints", () => {
  it("契約・採用などの文脈リスクを含む長めの文章ではAI文脈チェック入口を出す", () => {
    const inputText = [
      "A社の佐藤様向けに、Project Blue Bridge の提案メモを作成します。",
      "まだ正式発表前なので、社外共有はしない前提でお願いします。",
      "候補者の山田花子さんについて、最終面談後の評価メモも含めます。",
      "給与条件は内定前に社内だけで確認したいです。"
    ].join("\n");

    expect(shouldOfferContextCheck(inputText)).toBe(true);
  });

  it("短い日常文ではAI文脈チェック入口を出さない", () => {
    expect(shouldOfferContextCheck("今日は天気がよいので、あとでメモを整理します。")).toBe(false);
  });

  it("長くても文脈リスクのヒント語がなければAI文脈チェック入口を出さない", () => {
    const inputText = "この文章は公開済みの一般的な説明文です。ブラウザ上で入力の挙動を確認するためのダミーテキストです。";

    expect(shouldOfferContextCheck(inputText)).toBe(false);
  });

  it("既存のルール検出結果があればAI文脈チェック入口の判断材料にする", () => {
    const inputText = "連絡先とAPIキーの控えを貼り付けます。社内確認用です。";

    expect(
      shouldOfferContextCheck(inputText, [
        buildFinding({
          ruleId: "env_secret",
          label: "秘密情報",
          category: "secret",
          riskLevel: "high",
          start: 4,
          end: 20
        })
      ])
    ).toBe(true);
  });
});
