import type { Config } from "tailwindcss";

export default {
  content: ["./**/*.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "Hiragino Sans",
          "Yu Gothic",
          "Meiryo",
          "sans-serif"
        ]
      },
      colors: {
        ink: "var(--amc-color-text)",
        muted: "var(--amc-color-text-muted)",
        paper: "var(--amc-color-background-subtle)",
        surface: "var(--amc-color-surface)",
        cloud: "var(--amc-color-surface-muted)",
        line: "var(--amc-color-border)",
        leaf: "var(--amc-color-primary)",
        signal: "var(--amc-color-risk-low)",
        caution: "var(--amc-color-risk-medium)"
      },
      borderRadius: {
        card: "var(--amc-radius-surface)"
      },
      boxShadow: {
        soft: "var(--amc-shadow-soft)",
        panel: "var(--amc-shadow-product)"
      }
    }
  },
  plugins: []
} satisfies Config;
