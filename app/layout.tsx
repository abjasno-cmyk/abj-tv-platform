import type { Metadata } from "next";
import { Inter } from "next/font/google";
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
});

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="cs">
      <body className={`${inter.className} bg-slate-50 text-gray-900 antialiased`}>
        <main className="mx-auto min-h-screen w-full max-w-5xl px-4 pb-28 pt-6 sm:px-6">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
