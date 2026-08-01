import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = resolve(".");

const paths = {
  rootPackage: "package.json",
  siteCss: "apps/site/src/index.css",
  extensionCss: "apps/extension/entrypoints/options/style.css",
  sitePostcss: "apps/site/postcss.config.cjs",
  extensionPostcss: "apps/extension/postcss.config.cjs",
  extensionConfig: "apps/extension/wxt.config.ts",
  siteLegacyConfig: "apps/site/tailwind.config.ts",
  extensionLegacyConfig: "apps/extension/tailwind.config.ts",
  siteBuildAssets: "apps/site/dist/assets",
  extensionBuildAssets: "apps/extension/.output/chrome-mv3/assets"
};

function fail(message) {
  throw new Error("Tailwind CSS 4 QA failed: " + message);
}

function read(relativePath) {
  return readFileSync(resolve(rootDir, relativePath), "utf8");
}

function assertIncludes(text, needle, context) {
  if (!text.includes(needle)) {
    fail(context + " に「" + needle + "」が必要です");
  }
}

function readBuiltCss(relativeDirectory) {
  const directory = resolve(rootDir, relativeDirectory);
  if (!existsSync(directory)) {
    fail(relativeDirectory + " がありません。先に pnpm build を実行してください");
  }

  const cssFiles = readdirSync(directory)
    .filter((fileName) => fileName.endsWith(".css"))
    .sort();

  if (cssFiles.length === 0) {
    fail(relativeDirectory + " にCSSビルド成果物がありません");
  }

  return cssFiles.map((fileName) => read(relativeDirectory + "/" + fileName)).join("\n");
}

const rootPackage = JSON.parse(read(paths.rootPackage));
const siteCss = read(paths.siteCss);
const extensionCss = read(paths.extensionCss);
const extensionConfig = read(paths.extensionConfig);

for (const dependencyName of ["tailwindcss", "@tailwindcss/postcss"]) {
  const version = rootPackage.devDependencies?.[dependencyName];
  if (typeof version !== "string" || !/^[~^]?4\./u.test(version)) {
    fail(dependencyName + " は4系へ固定してください");
  }
}

if ("autoprefixer" in (rootPackage.devDependencies ?? {})) {
  fail("Tailwind CSS 4では不要なautoprefixerをdevDependenciesへ含めないでください");
}

for (const postcssPath of [paths.sitePostcss, paths.extensionPostcss]) {
  const postcss = read(postcssPath);
  assertIncludes(postcss, '"@tailwindcss/postcss"', postcssPath);
  if (postcss.includes("autoprefixer") || postcss.includes("tailwindcss:")) {
    fail(postcssPath + " にTailwind CSS 3形式のPostCSS設定が残っています");
  }
}

for (const legacyConfig of [paths.siteLegacyConfig, paths.extensionLegacyConfig]) {
  if (existsSync(resolve(rootDir, legacyConfig))) {
    fail(legacyConfig + " をCSS-first設定へ移行してください");
  }
}

for (const [cssPath, css] of [
  [paths.siteCss, siteCss],
  [paths.extensionCss, extensionCss]
]) {
  assertIncludes(css, '@import "tailwindcss" source(none)', cssPath);
  assertIncludes(css, "@source", cssPath);
  assertIncludes(css, "@theme", cssPath);
  if (css.includes("@tailwind ")) {
    fail(cssPath + " にTailwind CSS 3形式の@tailwind directiveが残っています");
  }
}

for (const token of [
  "--color-ink:",
  "--color-muted:",
  "--color-line:",
  "--color-leaf:",
  "--color-signal:",
  "--radius-card:",
  "--shadow-soft:",
  "--shadow-panel:"
]) {
  assertIncludes(siteCss, token, paths.siteCss);
}

for (const token of [
  "--color-ink:",
  "--color-paper:",
  "--color-line:",
  "--color-leaf:",
  "--color-signal:"
]) {
  assertIncludes(extensionCss, token, paths.extensionCss);
}

assertIncludes(siteCss, '@source not "./**/*.test.ts"', paths.siteCss);
assertIncludes(siteCss, '@source not "./**/*.test.tsx"', paths.siteCss);
assertIncludes(extensionConfig, 'minimum_chrome_version: "111"', paths.extensionConfig);

const siteBuildCss = readBuiltCss(paths.siteBuildAssets);
for (const generatedClass of [
  "rounded-card",
  "shadow-soft",
  "shadow-panel",
  "inset-shadow-sm",
  "outline-hidden",
  "data-hovered",
  "data-focus-visible",
  "group-data-",
  "ring-signal"
]) {
  assertIncludes(siteBuildCss, generatedClass, "公開サイトのproduction CSS");
}

const extensionBuildCss = readBuiltCss(paths.extensionBuildAssets);
for (const generatedClass of [
  "outline-hidden",
  "data-hovered",
  "data-focus-visible",
  "data-selected",
  "group-data-",
  "ring-signal"
]) {
  assertIncludes(extensionBuildCss, generatedClass, "Options Pageのproduction CSS");
}

console.log("Tailwind CSS 4 QA passed");
