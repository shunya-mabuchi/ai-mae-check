export const SITE_BASE_PATH = "/ai-mae-check";
export const SITE_ORIGIN = "https://shunya-mabuchi.github.io";
export const SITE_URLS = {
  home: "https://shunya-mabuchi.github.io/ai-mae-check/",
  privacy: "https://shunya-mabuchi.github.io/ai-mae-check/privacy/",
  support: "https://shunya-mabuchi.github.io/ai-mae-check/support/",
  rules: "https://shunya-mabuchi.github.io/ai-mae-check/rules/latest.json"
} as const;

export const githubPagesConfig = {
  repository: "shunya-mabuchi/ai-mae-check",
  productionBranch: "main",
  workflow: ".github/workflows/github-pages.yml",
  buildCommand: "pnpm build:pages",
  buildOutputDirectory: "apps/site/dist",
  nodeVersion: "22",
  pnpmVersion: "10.12.1",
  basePath: SITE_BASE_PATH,
  urls: SITE_URLS
} as const;

export function sitePath(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_BASE_PATH}${normalizedPath}`;
}
