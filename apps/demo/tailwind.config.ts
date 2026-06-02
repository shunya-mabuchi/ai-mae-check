import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
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
        ink: "#202124",
        paper: "#fbfaf7",
        line: "#dfded8",
        leaf: "#2f7d57",
        caution: "#b45309"
      }
    }
  },
  plugins: []
} satisfies Config;
