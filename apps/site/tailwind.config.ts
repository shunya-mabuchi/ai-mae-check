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
        ink: "#171a1f",
        muted: "#616a73",
        paper: "#f4f7f1",
        surface: "#fffffb",
        cloud: "#edf2ee",
        line: "#d9ded8",
        leaf: "#247a5b",
        signal: "#2857a3",
        caution: "#b45309"
      },
      borderRadius: {
        card: "8px"
      },
      boxShadow: {
        soft: "0 12px 34px rgba(23, 26, 31, 0.07)",
        panel: "0 28px 80px rgba(23, 26, 31, 0.16)"
      }
    }
  },
  plugins: []
} satisfies Config;
