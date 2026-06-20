import { LLM_BRIDGE_NONCE_QUERY_PARAM } from "./llmBridgeMessages";

export const BRIDGE_LOAD_TIMEOUT_MS = 15000;

interface BridgeCryptoLike {
  randomUUID?: () => string;
  getRandomValues?: <T extends ArrayBufferView>(array: T) => T;
}

export function createLlmBridgeNonce(cryptoProvider: BridgeCryptoLike | undefined = globalThis.crypto): string {
  if (cryptoProvider?.randomUUID) {
    return cryptoProvider.randomUUID();
  }

  if (!cryptoProvider?.getRandomValues) {
    throw new Error("AI文脈チェック用の接続nonceを生成できませんでした。");
  }

  const bytes = cryptoProvider.getRandomValues(new Uint8Array(16));
  const versionByte = bytes[6];
  const variantByte = bytes[8];
  if (versionByte === undefined || variantByte === undefined) {
    throw new Error("AI文脈チェック用の接続nonceを生成できませんでした。");
  }

  bytes[6] = (versionByte & 0x0f) | 0x40;
  bytes[8] = (variantByte & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function createLlmBridgePageUrl(resourceUrl: string, nonce: string): string {
  const url = new URL(resourceUrl);
  url.searchParams.set(LLM_BRIDGE_NONCE_QUERY_PARAM, nonce);
  return url.toString();
}

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
