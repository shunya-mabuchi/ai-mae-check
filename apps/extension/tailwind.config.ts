import type { Config } from "tailwindcss";

export default {
  content: ["./entrypoints/**/*.{html,ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#202124",
        paper: "#fbfaf7",
        line: "#dfded8",
        leaf: "#2f7d57"
      },
      fontFamily: {
        sans: ["system-ui", "Hiragino Sans", "Yu Gothic", "Meiryo", "sans-serif"]
      }
    }
  },
  plugins: []
} satisfies Config;
