import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = resolve(".");
const basePath = "/ai-mae-check/";

const paths = {
  home: "apps/site/index.html",
  privacy: "apps/site/privacy/index.html",
  support: "apps/site/support/index.html",
  notFound: "apps/site/404.html",
  manifest: "apps/site/public/site.webmanifest",
  robots: "apps/site/public/robots.txt",
  sitemap: "apps/site/public/sitemap.xml",
  ogp: "apps/site/public/ogp.png",
  favicon16: "apps/site/public/favicon-16.png",
  favicon32: "apps/site/public/favicon-32.png",
  icon128: "apps/site/public/icon-128.png",
  extensionImage: "apps/site/public/extension-paste-modal.png",
  docs: "docs/lp-seo-publication.md"
};

function fail(message) {
  throw new Error(`公開サイトQA failed: ${message}`);
}

function read(relativePath) {
  return readFileSync(resolve(rootDir, relativePath), "utf8");
}

function assertExists(relativePath) {
  if (!existsSync(resolve(rootDir, relativePath))) {
    fail(`${relativePath} がありません`);
  }
}

function assertIncludes(text, needle, context) {
  if (!text.includes(needle)) {
    fail(`${context} に「${needle}」が必要です`);
  }
}

function assertStaticPage(relativePath, options) {
  const html = read(relativePath);
  for (const phrase of [
    '<html lang="ja">',
    '<meta name="viewport"',
    'name="description"',
    `<title>${options.title}</title>`,
    options.heading
  ]) {
    assertIncludes(html, phrase, relativePath);
  }

  if (html.includes('type="module"')) {
    fail(`${relativePath} はJavaScriptなしでも読める静的ページにしてください`);
  }
}

function assertBuiltAssetPaths(relativePath) {
  const html = read(relativePath);
  const assetReferences = [];

  for (const match of html.matchAll(/(?:href|src)\s*=\s*(["'])(\/[^"']+)\1/gu)) {
    assetReferences.push(match[2]);
  }

  for (const match of html.matchAll(/srcset\s*=\s*(["'])(.*?)\1/gu)) {
    for (const candidate of match[2].split(",")) {
      const reference = candidate.trim().split(/\s+/u)[0];
      if (reference.startsWith("/")) {
        assetReferences.push(reference);
      }
    }
  }

  for (const match of html.matchAll(/url\(\s*(["']?)(\/[^"')\s]+)\1\s*\)/gu)) {
    assetReferences.push(match[2]);
  }

  for (const reference of assetReferences) {
    if (!reference.startsWith(basePath)) {
      fail(`${relativePath} の公開アセット参照がbase path外です: ${reference}`);
    }
  }
}

for (const path of Object.values(paths)) {
  assertExists(path);
}

const home = read(paths.home);
const docs = read(paths.docs);
const manifest = JSON.parse(read(paths.manifest));
const sitemap = read(paths.sitemap);

for (const needle of [
  '<html lang="ja">',
  "<title>AIまえチェック | AIに送る前に、消し忘れを見つける。</title>",
  'name="description"',
  'rel="canonical"',
  'href="https://shunya-mabuchi.github.io/ai-mae-check/"',
  'rel="icon"',
  'rel="apple-touch-icon"',
  'rel="manifest"',
  'property="og:site_name"',
  'property="og:type"',
  'property="og:url"',
  'property="og:title"',
  'property="og:description"',
  'property="og:image"',
  'name="twitter:card"',
  'name="twitter:title"',
  'name="twitter:description"',
  'name="twitter:image"',
  "/ogp.png"
]) {
  assertIncludes(home, needle, paths.home);
}

for (const phrase of ["ChatGPT", "Claude", "Gemini", "Chrome拡張", "外部LLM API"]) {
  assertIncludes(home, phrase, paths.home);
}

assertStaticPage(paths.privacy, {
  title: "プライバシーポリシー | AIまえチェック",
  heading: ">プライバシーポリシー</h1>"
});
assertStaticPage(paths.support, {
  title: "サポート | AIまえチェック",
  heading: ">サポート</h1>"
});
assertStaticPage(paths.notFound, {
  title: "ページが見つかりません | AIまえチェック",
  heading: ">ページが見つかりません</h1>"
});
assertIncludes(read(paths.notFound), 'name="robots" content="noindex"', paths.notFound);

if (manifest.name !== "AIまえチェック" || manifest.short_name !== "AIまえチェック") {
  fail("site.webmanifestの製品名が一致しません");
}

assertIncludes(read(paths.robots), "Sitemap: https://shunya-mabuchi.github.io/ai-mae-check/sitemap.xml", paths.robots);
for (const url of [
  "https://shunya-mabuchi.github.io/ai-mae-check/",
  "https://shunya-mabuchi.github.io/ai-mae-check/privacy/",
  "https://shunya-mabuchi.github.io/ai-mae-check/support/"
]) {
  assertIncludes(sitemap, url, paths.sitemap);
  assertIncludes(docs, url, paths.docs);
}

for (const phrase of [
  "カスタムドメイン方針",
  "GitHub Pages",
  "2026-07-29時点の判断",
  "独自ドメインとGoogle Search Console導入は現時点では見送ります",
  "Google Search Console",
  "pnpm qa:site:publication"
]) {
  assertIncludes(docs, phrase, paths.docs);
}

for (const builtPath of [
  "apps/site/dist/index.html",
  "apps/site/dist/privacy/index.html",
  "apps/site/dist/support/index.html",
  "apps/site/dist/404.html"
]) {
  assertExists(builtPath);
  assertBuiltAssetPaths(builtPath);
}

for (const builtAsset of [
  "apps/site/dist/.nojekyll",
  "apps/site/dist/ogp.png",
  "apps/site/dist/icon-128.png",
  "apps/site/dist/extension-paste-modal.png"
]) {
  assertExists(builtAsset);
}

console.log("公開サイトQA passed");
