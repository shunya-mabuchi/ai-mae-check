export const colorTokens = {
  background: "#ffffff",
  backgroundSubtle: "#f6f8f9",
  surface: "#ffffff",
  surfaceMuted: "#eef2f3",
  text: "#101828",
  textMuted: "#5d6673",
  border: "#dfe3e8",
  primary: "#078754",
  primaryHover: "#066d45",
  focus: "#175cd3",
  riskHigh: "#d92d20",
  riskMedium: "#b54708",
  riskLow: "#175cd3"
} as const;

export const radiusTokens = {
  control: "6px",
  surface: "8px"
} as const;

export const shadowTokens = {
  soft: "0 8px 24px rgba(16, 24, 40, 0.06)",
  product: "0 24px 64px rgba(16, 24, 40, 0.14)"
} as const;

export const layoutTokens = {
  contentMax: "1200px",
  readingMax: "760px"
} as const;

export type ColorTokenName = keyof typeof colorTokens;
