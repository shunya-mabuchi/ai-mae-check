import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildUpdateCheckUrl,
  listingContainsUrl,
  parsePublishedVersion
} from "./lib/chrome-web-store-publication.mjs";

const state = JSON.parse(readFileSync(resolve("docs/chrome-web-store-published.json"), "utf8"));
const listingUrl = `https://chrome.google.com/webstore/detail/${state.extensionId}`;

function fail(message) {
  throw new Error(`Chrome Web Store公開状態QA failed: ${message}`);
}

async function fetchText(url) {
  const response = await fetch(url, {
    method: "GET",
    headers: { accept: "text/html,application/xml;q=0.9,*/*;q=0.8" },
    redirect: "follow"
  });

  if (!response.ok) {
    fail(`${url} がHTTP ${response.status}を返しました`);
  }

  return response.text();
}

const updateXml = await fetchText(buildUpdateCheckUrl(state.extensionId));
const publishedVersion = parsePublishedVersion(updateXml, state.extensionId);
if (publishedVersion !== state.version) {
  fail(`公開バージョンが記録と一致しません。expected=${state.version} actual=${publishedVersion}`);
}

const listingHtml = await fetchText(listingUrl);
for (const [label, expectedUrl] of [
  ["サポートURL", state.supportUrl],
  ["プライバシーポリシーURL", state.privacyPolicyUrl]
]) {
  if (!listingContainsUrl(listingHtml, expectedUrl)) {
    fail(`${label}が公開ページに見つかりません: ${expectedUrl}`);
  }
}

console.log(`Chrome Web Store公開状態QA passed: version=${publishedVersion}`);
