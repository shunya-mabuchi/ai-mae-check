import {
  readReviewModalRuntime,
  type ReviewModalRuntimeModule
} from "./reviewModalRuntimeContract";

export const REVIEW_MODAL_LOAD_FAILURE_MESSAGE =
  "AIまえチェックの確認画面を準備できませんでした。操作は中止しました。ページを再読み込みしてから再試行してください。";

type ImportRuntimeModule = (moduleUrl: string) => Promise<unknown>;

export interface LoadReviewModalRuntimeOptions {
  moduleUrl: string;
  target?: typeof globalThis;
  importModule?: ImportRuntimeModule;
}

async function importRuntimeModule(moduleUrl: string): Promise<unknown> {
  return import(/* @vite-ignore */ moduleUrl);
}

export function createReviewModalRuntimeLoader() {
  let runtimePromise: Promise<ReviewModalRuntimeModule> | undefined;

  return async function loadReviewModalRuntime(
    options: LoadReviewModalRuntimeOptions
  ): Promise<ReviewModalRuntimeModule> {
    const target = options.target ?? globalThis;
    const loadedRuntime = readReviewModalRuntime(target);
    if (loadedRuntime) {
      return loadedRuntime;
    }

    runtimePromise ??= (options.importModule ?? importRuntimeModule)(options.moduleUrl)
      .then(() => {
        const runtime = readReviewModalRuntime(target);
        if (!runtime) {
          throw new Error("確認画面を準備できませんでした。");
        }
        return runtime;
      })
      .catch((error: unknown) => {
        runtimePromise = undefined;
        throw error;
      });

    return runtimePromise;
  };
}

export const loadReviewModalRuntime = createReviewModalRuntimeLoader();
