export type PasteReviewModalMode = "default" | "paste_guard" | "context_check";

export interface PasteReviewModalCopy {
  title: string;
  description: string;
  maskButtonText: string;
}

const pasteReviewModalCopyByMode: Record<PasteReviewModalMode, PasteReviewModalCopy> = {
  default: {
    title: "このまま貼り付けますか？",
    description: "貼り付けようとしている文章に、注意が必要な情報が含まれている可能性があります。",
    maskButtonText: "安全化して入力"
  },
  paste_guard: {
    title: "安全化してから貼り付けますか？",
    description:
      "貼り付けようとしている文章に、秘密情報や高リスク情報の可能性があります。そのまま貼り付けず、安全化してから入力できます。",
    maskButtonText: "安全化して貼り付け"
  },
  context_check: {
    title: "AI文脈チェックを実行しますか？",
    description:
      "ルールベースの検出はありませんが、文脈によっては注意が必要な内容の可能性があります。必要に応じてブラウザ内でAI文脈チェックを実行できます。",
    maskButtonText: "候補を安全化して入力"
  }
};

export function createPasteReviewModalCopy(mode: PasteReviewModalMode = "default"): PasteReviewModalCopy {
  return pasteReviewModalCopyByMode[mode];
}
