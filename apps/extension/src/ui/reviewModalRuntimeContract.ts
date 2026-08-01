import type {
  PasteReviewModalDecision,
  PasteReviewModalOptions
} from "../lib/pasteReviewModalTypes";

export const REVIEW_MODAL_RUNTIME_GLOBAL = "__AI_MAE_REVIEW_MODAL_RUNTIME__";

export interface ReviewModalRuntimeModule {
  showPasteReviewModal: (
    options: PasteReviewModalOptions
  ) => Promise<PasteReviewModalDecision>;
}

type ReviewModalRuntimeGlobal = typeof globalThis &
  Record<typeof REVIEW_MODAL_RUNTIME_GLOBAL, ReviewModalRuntimeModule | undefined>;

export function readReviewModalRuntime(
  target: typeof globalThis
): ReviewModalRuntimeModule | undefined {
  return (target as ReviewModalRuntimeGlobal)[REVIEW_MODAL_RUNTIME_GLOBAL];
}

export function registerReviewModalRuntime(
  target: typeof globalThis,
  runtime: ReviewModalRuntimeModule
): void {
  (target as ReviewModalRuntimeGlobal)[REVIEW_MODAL_RUNTIME_GLOBAL] = runtime;
}
