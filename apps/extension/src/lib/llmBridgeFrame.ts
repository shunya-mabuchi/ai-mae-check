export const BRIDGE_LOAD_TIMEOUT_MS = 15000;

export function createLlmBridgeIframe(): HTMLIFrameElement {
  const iframe = document.createElement("iframe");
  iframe.title = "AIまえチェック AI文脈チェック";
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = [
    "position: fixed",
    "width: 0",
    "height: 0",
    "border: 0",
    "opacity: 0",
    "pointer-events: none",
    "left: -9999px",
    "top: -9999px"
  ].join(";");
  return iframe;
}

export function waitForLlmBridgeIframeLoad(
  iframe: HTMLIFrameElement,
  timeoutMs = BRIDGE_LOAD_TIMEOUT_MS
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = globalThis.setTimeout(() => {
      reject(new Error("AI文脈チェック用の拡張ページを準備できませんでした。"));
    }, timeoutMs);

    iframe.addEventListener(
      "load",
      () => {
        globalThis.clearTimeout(timeout);
        resolve();
      },
      { once: true }
    );
  });
}
