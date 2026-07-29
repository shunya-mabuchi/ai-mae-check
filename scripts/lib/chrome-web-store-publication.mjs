const defaultProductVersion = "148.0.0.0";

export function buildUpdateCheckUrl(extensionId, productVersion = defaultProductVersion) {
  const request = encodeURIComponent(`id=${extensionId}&uc`);
  return `https://clients2.google.com/service/update2/crx?response=updatecheck&prodversion=${encodeURIComponent(productVersion)}&acceptformat=crx3&x=${request}`;
}

export function parsePublishedVersion(xml, extensionId) {
  const appPattern = new RegExp(
    `<app\\b[^>]*\\bappid=["']${escapeRegExp(extensionId)}["'][^>]*>([\\s\\S]*?)<\\/app>`,
    "iu"
  );
  const app = xml.match(appPattern)?.[1];
  const version = app?.match(/<updatecheck\b[^>]*\bversion=["']([^"']+)["']/iu)?.[1];

  if (!version) {
    throw new Error("公開版のバージョンを更新情報から読み取れませんでした");
  }

  return version;
}

export function listingContainsUrl(html, expectedUrl) {
  const decoded = html
    .replaceAll("\\u003a", ":")
    .replaceAll("\\u002f", "/")
    .replaceAll("\\/", "/");
  const normalizedExpected = expectedUrl.replace(/\/+$/u, "");
  return decoded.includes(normalizedExpected);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
