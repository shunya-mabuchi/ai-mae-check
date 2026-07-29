export type SiteRoute = "home" | "privacy" | "support";

export const SITE_BASE_PATH = "/ai-mae-check";
export const SITE_ORIGIN = "https://shunya-mabuchi.github.io";
export const SITE_URLS = {
  home: "https://shunya-mabuchi.github.io/ai-mae-check/",
  privacy: "https://shunya-mabuchi.github.io/ai-mae-check/privacy/",
  support: "https://shunya-mabuchi.github.io/ai-mae-check/support/",
  rules: "https://shunya-mabuchi.github.io/ai-mae-check/api/rules/latest.json"
} as const;

export const githubPagesConfig = {
  repository: "shunya-mabuchi/ai-mae-check",
  productionBranch: "main",
  workflow: ".github/workflows/github-pages.yml",
  buildCommand: "pnpm build:pages",
  buildOutputDirectory: "apps/demo/dist",
  nodeVersion: "22",
  pnpmVersion: "10.12.1",
  basePath: SITE_BASE_PATH,
  urls: SITE_URLS
} as const;

export function sitePath(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_BASE_PATH}${normalizedPath}`;
}

export function resolveSiteRoute(pathname: string): SiteRoute {
  const normalizedPath = pathname.replace(/\/+$/, "") || "/";
  const routePath = normalizedPath === SITE_BASE_PATH
    ? "/"
    : normalizedPath.startsWith(`${SITE_BASE_PATH}/`)
      ? normalizedPath.slice(SITE_BASE_PATH.length)
      : normalizedPath;

  if (routePath === "/privacy") {
    return "privacy";
  }

  if (routePath === "/support") {
    return "support";
  }

  return "home";
}
