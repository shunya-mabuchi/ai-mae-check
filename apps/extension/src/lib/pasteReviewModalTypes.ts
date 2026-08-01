import type { DetectionResult } from "@ai-mae-check/core";
import type { AiMaeCheckSettings } from "./settings";
import type { PasteReviewModalMode } from "./pasteReviewModalCopy";

export type PasteReviewModalDecision =
  | {
      type: "insert";
      text: string;
    }
  | {
      type: "cancel";
    };

export interface PasteReviewModalOptions {
  inputText: string;
  detection: DetectionResult;
  settings: AiMaeCheckSettings;
  mode?: PasteReviewModalMode;
}

export interface PasteReviewDialogElements {
  list: HTMLDivElement;
  preview: HTMLPreElement;
  llmStatus: HTMLParagraphElement;
  candidateList: HTMLDivElement;
  footerNote: HTMLParagraphElement;
  maskButton: HTMLButtonElement;
  llmButton: HTMLButtonElement;
  rawButton: HTMLButtonElement;
  cancelButton: HTMLButtonElement;
}
