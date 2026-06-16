export const EXTENSION_RUNTIME_UNAVAILABLE_MESSAGE =
  "AI文脈チェックをChrome拡張の実行環境で起動できませんでした。ページを再読み込みし、拡張機能が有効か確認してください。";

export interface ExtensionRuntimeUrlResolver {
  getURL: (path: string) => string;
}

function getDefaultRuntime(): ExtensionRuntimeUrlResolver | undefined {
  const maybeGlobal = globalThis as typeof globalThis & {
    chrome?: {
      runtime?: Partial<ExtensionRuntimeUrlResolver>;
    };
  };

  const runtime = maybeGlobal.chrome?.runtime;
  if (runtime && typeof runtime.getURL === "function") {
    return { getURL: runtime.getURL.bind(runtime) };
  }

  return undefined;
}

export function getExtensionResourceUrl(path: string, runtime: ExtensionRuntimeUrlResolver | undefined = getDefaultRuntime()): string {
  if (!runtime || typeof runtime.getURL !== "function") {
    throw new Error(EXTENSION_RUNTIME_UNAVAILABLE_MESSAGE);
  }

  return runtime.getURL(path);
}
