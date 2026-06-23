import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = resolve(".");

const paths = {
  index: "apps/demo/index.html",
  manifest: "apps/demo/public/site.webmanifest",
  robots: "apps/demo/public/robots.txt",
  sitemap: "apps/demo/public/sitemap.xml",
  ogp: "apps/demo/public/ogp.png",
  favicon16: "apps/demo/public/favicon-16.png",
  favicon32: "apps/demo/public/favicon-32.png",
  icon128: "apps/demo/public/icon-128.png",
  docs: "docs/lp-seo-publication.md"
};

function fail(message) {
  throw new Error(`demo SEO QA failed: ${message}`);
}

function read(relativePath) {
  return readFileSync(resolve(rootDir, relativePath), "utf8");
}

function assertExists(relativePath) {
  if (!existsSync(resolve(rootDir, relativePath))) {
    fail(`${relativePath} is missing`);
  }
}

function assertIncludes(text, needle, context) {
  if (!text.includes(needle)) {
    fail(`${context} must include: ${needle}`);
  }
}

for (const path of Object.values(paths)) {
  assertExists(path);
}

const index = read(paths.index);
const docs = read(paths.docs);
const manifest = JSON.parse(read(paths.manifest));
const sitemap = read(paths.sitemap);

for (const needle of [
  '<html lang="ja">',
  "<title>AIまえチェック | AIに送る前に、消し忘れを見つける。</title>",
  'name="description"',
  'rel="canonical"',
  'href="https://ai-mae-check.pages.dev/"',
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
  assertIncludes(index, needle, paths.index);
}

for (const phrase of ["ChatGPT", "Claude", "Gemini", "Chrome拡張", "外部LLM API"]) {
  assertIncludes(index, phrase, paths.index);
}

if (manifest.name !== "AIまえチェック" || manifest.short_name !== "AIまえチェック") {
  fail("site.webmanifest must use the product name");
}

assertIncludes(read(paths.robots), "Sitemap: https://ai-mae-check.pages.dev/sitemap.xml", paths.robots);
for (const url of ["https://ai-mae-check.pages.dev/", "https://ai-mae-check.pages.dev/privacy", "https://ai-mae-check.pages.dev/support"]) {
  assertIncludes(sitemap, url, paths.sitemap);
  assertIncludes(docs, url, paths.docs);
}

for (const phrase of ["カスタムドメイン方針", "0.1.xでは `ai-mae-check.pages.dev`", "Google Search Console", "pnpm qa:demo:seo"]) {
  assertIncludes(docs, phrase, paths.docs);
}

console.log("demo SEO QA passed");
