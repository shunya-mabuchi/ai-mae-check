import { transformText, type Finding } from "@ai-mae-check/core";
import type { PasteReviewModalMode } from "./pasteReviewModalCopy";

export function createPasteReviewPreviewText(inputText: string, findings: Finding[]): string {
  return transformText(inputText, findings, "generalize").transformedText;
}

export function createPasteReviewInsertText(
  inputText: string,
  findings: Finding[],
  mode: PasteReviewModalMode
): string {
  return transformText(inputText, findings, "generalize").transformedText;
}
