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
          red: "#FF6A00",
          redDim: "rgba(255,106,0,0.14)",
          text1: "#111111",
          text2: "rgba(17,17,17,0.72)",
          text3: "rgba(17,17,17,0.45)",
        },
        // VEROX design-system palette (additive — consumed only by /design-system).
        // Source of truth: zasilka VZORNIK.png brand swatch (#F37021).
        verox: {
          orange: "#F37021",
          orangeDeep: "#D85B12",
          orangeText: "#B8480A",
          orangeSoft: "#FBE6D6",
          ink: "#171411",
          charcoal: "#303030",
          gray: "#717171",
          line: "rgba(23,20,17,0.12)",
          paper: "#FBF8F2",
          paperDeep: "#F2ECE0",
          card: "#FFFFFF",
        },
      },
      fontFamily: {
        serif: ["var(--font-serif)"],
        sans: ["var(--font-sans)"],
        // VEROX type system (additive — variables injected on /design-system only).
        "verox-display": ["var(--font-verox-display)", "Georgia", "serif"],
        "verox-sans": ["var(--font-verox-sans)", "system-ui", "sans-serif"],
        "verox-mono": ["var(--font-verox-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
