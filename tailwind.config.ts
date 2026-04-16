import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        abj: {
          deep: "#07111E",
          main: "#0B1F3A",
          panel: "#0E2745",
          hospoda: "#060C17",
          card: "#0A1E35",
          gold: "#C6A85B",
          goldDim: "rgba(198,168,91,0.13)",
          red: "#A63A3A",
          redDim: "rgba(166,58,58,0.18)",
          text1: "#E6E9EF",
          text2: "#9AA3B2",
          text3: "rgba(154,163,178,0.4)",
        },
      },
      fontFamily: {
        serif: ["var(--font-serif)"],
        sans: ["var(--font-sans)"],
      },
    },
  },
  plugins: [],
};

export default config;
