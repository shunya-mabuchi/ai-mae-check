let workerUrlPromise: Promise<string> | null = null;

async function createWorkerBlobUrl(): Promise<string> {
  const extensionWorkerUrl = chrome.runtime.getURL("llm-worker.js");
  const response = await fetch(extensionWorkerUrl);

  if (!response.ok) {
    throw new Error("AI文脈チェック用のWorkerを読み込めませんでした。");
  }

  const workerSource = await response.text();
  const blob = new Blob([workerSource], { type: "text/javascript" });
  return URL.createObjectURL(blob);
}

export function getLlmWorkerUrl(): Promise<string> {
  workerUrlPromise ??= createWorkerBlobUrl();
  return workerUrlPromise;
}
