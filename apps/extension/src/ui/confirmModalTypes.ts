import type { DetectionResult, TransformMode } from "@ai-mae-check/core";
import type { AiMaeCheckSettings } from "../lib/settings";

export type ConfirmModalDecision =
  | {
      type: "submit";
      text: string;
    }
  | {
      type: "cancel";
    };

export interface SendConfirmModalOptions {
  inputText: string;
  detection: DetectionResult;
  defaultMode?: TransformMode;
  llm?: AiMaeCheckSettings["llm"];
}

export interface ConfirmModalSummaryItem {
  label: string;
  value: string;
}

export interface SendConfirmDialogElements {
  categoryList: HTMLDivElement;
  preview: HTMLPreElement;
  status: HTMLParagraphElement;
  llmStatus: HTMLParagraphElement;
  candidateList: HTMLDivElement;
  submitButton: HTMLButtonElement;
  llmButton: HTMLButtonElement;
  cancelButton: HTMLButtonElement;
}
