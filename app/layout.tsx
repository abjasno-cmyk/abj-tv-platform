import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { ABJNav } from "@/components/abj/Nav";
import { EditorialEventDebugPanel } from "@/components/dev/EditorialEventDebugPanel";

export const metadata: Metadata = {
  title: "ABJ TV Platform",
  description: "Lehká live TV platforma nad YouTube playlistem",
};

type RootLayoutProps = {
  children: React.ReactNode;
};

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
  weight: ["400", "600", "700"],
});

export default function RootLayout({ children }: RootLayoutProps) {
  const showEditorialDebug = process.env.NODE_ENV !== "production";
  return (
    <html lang="cs" className={`${playfair.variable} ${inter.variable}`}>
      <body className="min-h-screen bg-abj-main text-abj-text1 antialiased">
        <ABJNav />
        <main className="min-h-[calc(100vh-46px)] overflow-hidden pt-[46px]">{children}</main>
        {showEditorialDebug ? <EditorialEventDebugPanel /> : null}
      </body>
    </html>
  );
}
