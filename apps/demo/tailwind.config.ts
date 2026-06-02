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
        muted: "#63665f",
        paper: "#f7f4ed",
        surface: "#fffdf8",
        cloud: "#eeebe3",
        line: "#dedbd1",
        leaf: "#2f7d57",
        caution: "#b45309"
      },
      borderRadius: {
        card: "8px"
      },
      boxShadow: {
        soft: "0 14px 38px rgba(32, 33, 36, 0.08)",
        panel: "0 28px 80px rgba(32, 33, 36, 0.16)"
      }
    }
  },
  plugins: []
} satisfies Config;
