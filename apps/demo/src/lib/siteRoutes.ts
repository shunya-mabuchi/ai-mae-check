export type SiteRoute = "home" | "privacy" | "support";

export const cloudflarePagesConfig = {
  projectName: "ai-mae-check",
  productionBranch: "main",
  rootDirectory: ".",
  buildCommand: "pnpm build:demo",
  buildOutputDirectory: "apps/demo/dist",
  nodeVersion: "22",
  pnpmVersion: "10.12.1",
  urls: {
    home: "https://ai-mae-check.pages.dev/",
    privacy: "https://ai-mae-check.pages.dev/privacy",
    support: "https://ai-mae-check.pages.dev/support"
  }
} as const;

export function resolveSiteRoute(pathname: string): SiteRoute {
  const normalizedPath = pathname.replace(/\/+$/, "") || "/";

  if (normalizedPath === "/privacy") {
    return "privacy";
  }

  if (normalizedPath === "/support") {
    return "support";
  }

  return "home";
}
