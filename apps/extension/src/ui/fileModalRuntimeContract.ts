import type { FilePreflightModalDecision, FilePreflightModalOptions } from "./fileModalTypes";

export const FILE_MODAL_RUNTIME_GLOBAL = "__AI_MAE_FILE_MODAL_RUNTIME__";

export interface FileModalRuntimeModule {
  showFilePreflightModal: (
    options: FilePreflightModalOptions,
    restoreFocusTarget?: HTMLElement
  ) => Promise<FilePreflightModalDecision>;
}

export function readFileModalRuntime(target: typeof globalThis): FileModalRuntimeModule | undefined {
  return (target as typeof globalThis & Record<typeof FILE_MODAL_RUNTIME_GLOBAL, FileModalRuntimeModule | undefined>)[
    FILE_MODAL_RUNTIME_GLOBAL
  ];
}

export function registerFileModalRuntime(target: typeof globalThis, runtime: FileModalRuntimeModule): void {
  (target as typeof globalThis & Record<typeof FILE_MODAL_RUNTIME_GLOBAL, FileModalRuntimeModule | undefined>)[
    FILE_MODAL_RUNTIME_GLOBAL
  ] = runtime;
}
