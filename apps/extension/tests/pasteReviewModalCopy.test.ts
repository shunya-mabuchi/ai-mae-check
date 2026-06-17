import { describe, expect, it } from "vitest";
import { createPasteReviewModalCopy } from "../src/lib/pasteReviewModalCopy";

describe("createPasteReviewModalCopy", () => {
  it("通常確認モードの文言を返す", () => {
    const copy = createPasteReviewModalCopy("default");

    expect(copy.title).toBe("このまま貼り付けますか？");
    expect(copy.description).toBe("貼り付けようとしている文章に、注意が必要な情報が含まれている可能性があります。");
    expect(copy.maskButtonText).toBe("安全化して入力");
  });

  it("安全化必須モードの文言を返す", () => {
    const copy = createPasteReviewModalCopy("paste_guard");

    expect(copy.title).toBe("安全化してから貼り付けますか？");
    expect(copy.description).toBe(
      "貼り付けようとしている文章に、秘密情報や高リスク情報の可能性があります。そのまま貼り付けず、安全化してから入力できます。"
    );
    expect(copy.maskButtonText).toBe("安全化して貼り付け");
  });

  it("AI文脈チェックモードの文言を返す", () => {
    const copy = createPasteReviewModalCopy("context_check");

    expect(copy.title).toBe("AI文脈チェックを実行しますか？");
    expect(copy.description).toBe(
      "ルールベースの検出はありませんが、文脈によっては注意が必要な内容の可能性があります。必要に応じてブラウザ内でAI文脈チェックを実行できます。"
    );
    expect(copy.maskButtonText).toBe("候補を安全化して入力");
  });
});
