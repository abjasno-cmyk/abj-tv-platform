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
          deep: "#FFFFFF",
          main: "#FFFFFF",
          light: "#F5F5F5",
          panel: "#F5F5F5",
          hospoda: "#FFFFFF",
          card: "#FFFFFF",
          gold: "#111111",
          goldDim: "rgba(17,17,17,0.14)",
          red: "#E30613",
          redDim: "rgba(227,6,19,0.14)",
          text1: "#111111",
          text2: "rgba(17,17,17,0.72)",
          text3: "rgba(17,17,17,0.45)",
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
