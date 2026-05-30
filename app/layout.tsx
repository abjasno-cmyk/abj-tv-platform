import type { Metadata } from "next";
import { Inter, Montserrat } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ABJNav } from "@/components/abj/Nav";
import { LegalFooter } from "@/components/abj/LegalFooter";
import { AuthProvider } from "@/components/auth/AuthProvider";
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

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-serif",
  weight: ["600", "700", "800"],
});

export default function RootLayout({ children }: RootLayoutProps) {
  const showEditorialDebug = process.env.NODE_ENV !== "production";
  return (
    <html lang="cs" className={`${montserrat.variable} ${inter.variable}`}>
      <body className="min-h-screen bg-abj-main text-abj-text1 antialiased">
        <Script id="verox-canonical-host-guard" strategy="beforeInteractive">
          {`
            (function () {
              try {
                var canonicalHost = "abj-tv-platform-n7e8.vercel.app";
                var host = window.location.host.toLowerCase();
                var hostPattern = /^abj-tv-platform-n7e8(?:-[a-z0-9-]+)?\\.vercel\\.app$/i;
                if (hostPattern.test(host) && host !== canonicalHost) {
                  var target =
                    window.location.protocol +
                    "//" +
                    canonicalHost +
                    window.location.pathname +
                    window.location.search +
                    window.location.hash;
                  window.location.replace(target);
                }
              } catch (_err) {
                // Ignore host guard failures.
              }
            })();
          `}
        </Script>
        <Script id="verox-legacy-token-cookie-cleanup" strategy="beforeInteractive">
          {`
            (function () {
              try {
                // F-C2 migration: actively expire the legacy non-HttpOnly
                // access-token cookie left over from older builds.
                document.cookie =
                  "verox_access_token=; Path=/; Max-Age=0; SameSite=Lax; Secure";
              } catch (_err) {
                // Ignore cleanup failures.
              }
            })();
          `}
        </Script>
        <AuthProvider>
          {/* Single global nav only — prevents duplicate legacy header stacks. */}
          <ABJNav />
          <main className="min-h-[calc(100vh-68px-46px)] pt-[68px]">{children}</main>
          <LegalFooter />
          {showEditorialDebug ? <EditorialEventDebugPanel /> : null}
        </AuthProvider>
      </body>
    </html>
  );
}
