import type { Metadata } from "next";
import { Bricolage_Grotesque, JetBrains_Mono, Source_Sans_3 } from "next/font/google";
import "./verox-ds.css";

// VEROX display face — characterful grotesque for the wordmark, headlines and
// the oversized editorial numerals. Latin Extended subset carries Czech diacritics.
const veroxDisplay = Bricolage_Grotesque({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-verox-display",
  display: "swap",
});

// Body / UI face — Source Sans 3 is the open-source descendant of Myriad Pro,
// the typeface used in the original VEROX layouts. Keeps the heritage, modernised.
const veroxSans = Source_Sans_3({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-verox-sans",
  display: "swap",
});

// Broadcast face — tabular mono for the live clock, timestamps and kickers.
const veroxMono = JetBrains_Mono({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "700"],
  variable: "--font-verox-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "VEROX · Design System",
  description: "Mainstreamový detox — modernizovaný vizuální systém VEROX.",
};

type DesignSystemLayoutProps = {
  children: React.ReactNode;
};

export default function DesignSystemLayout({ children }: DesignSystemLayoutProps) {
  // The global ABJNav steps aside on this route (see Nav.tsx), so the negative
  // top margin reclaims the 68px padding the root <main> reserves for it —
  // giving the showcase a true full-bleed canvas.
  return (
    <div
      className={`verox-ds -mt-[56px] md:-mt-[92px] ${veroxDisplay.variable} ${veroxSans.variable} ${veroxMono.variable}`}
    >
      {children}
    </div>
  );
}
