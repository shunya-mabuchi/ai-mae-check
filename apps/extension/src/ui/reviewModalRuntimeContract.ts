import type {
  PasteReviewModalDecision,
  PasteReviewModalOptions
} from "../lib/pasteReviewModalTypes";
import type {
  ConfirmModalDecision,
  SendConfirmModalOptions
} from "./confirmModalTypes";

export const REVIEW_MODAL_RUNTIME_GLOBAL = "__AI_MAE_REVIEW_MODAL_RUNTIME__";

export interface ReviewModalRuntimeModule {
  showPasteReviewModal: (
    options: PasteReviewModalOptions
  ) => Promise<PasteReviewModalDecision>;
  showSendConfirmModal: (
    options: SendConfirmModalOptions
  ) => Promise<ConfirmModalDecision>;
}

type ReviewModalRuntimeGlobal = typeof globalThis &
  Record<typeof REVIEW_MODAL_RUNTIME_GLOBAL, unknown>;

export function readReviewModalRuntime(
  target: typeof globalThis
): ReviewModalRuntimeModule | undefined {
  const runtime = (target as ReviewModalRuntimeGlobal)[REVIEW_MODAL_RUNTIME_GLOBAL];
  if (
    typeof runtime !== "object" ||
    runtime === null ||
    !("showPasteReviewModal" in runtime) ||
    !("showSendConfirmModal" in runtime) ||
    typeof runtime.showPasteReviewModal !== "function" ||
    typeof runtime.showSendConfirmModal !== "function"
  ) {
    return undefined;
  }

  return runtime as ReviewModalRuntimeModule;
}

export function registerReviewModalRuntime(
  target: typeof globalThis,
  runtime: ReviewModalRuntimeModule
): void {
  (target as ReviewModalRuntimeGlobal)[REVIEW_MODAL_RUNTIME_GLOBAL] = runtime;
}
