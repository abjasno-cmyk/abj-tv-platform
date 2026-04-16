import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "ABJ TV Platform",
  description: "Lehká live TV platforma nad YouTube playlistem",
};

type RootLayoutProps = {
  children: React.ReactNode;
};

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600"],
  variable: "--font-inter",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500"],
  variable: "--font-playfair",
});

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="cs">
      <body
        className={`${inter.className} ${inter.variable} ${playfair.variable} bg-[var(--bg)] text-[var(--text-main)] antialiased`}
      >
        <header className="border-b border-[var(--border)] px-6 py-4">
          <p className="mx-auto max-w-3xl text-center font-[var(--font-playfair)] text-2xl font-normal tracking-wide text-[var(--text-main)] md:text-3xl">
            Aby bylo jasno: Československá televize
          </p>
        </header>
        <main className="mx-auto min-h-screen w-full max-w-3xl px-6 pb-20">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
