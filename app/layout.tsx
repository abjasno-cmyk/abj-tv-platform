import type { Metadata } from "next";
import { Bricolage_Grotesque, JetBrains_Mono, Source_Sans_3 } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ABJNav } from "@/components/abj/Nav";
import { LegalFooter } from "@/components/abj/LegalFooter";
import { AppChrome } from "@/components/abj/AppChrome";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { EditorialEventDebugPanel } from "@/components/dev/EditorialEventDebugPanel";

export const metadata: Metadata = {
  title: "ABJ TV Platform",
  description: "Lehká live TV platforma nad YouTube playlistem",
};

type RootLayoutProps = {
  children: React.ReactNode;
};

// VEROX type system (global). Source Sans 3 is the open-source descendant of
// Myriad Pro from the original layouts; Bricolage Grotesque is the display face;
// JetBrains Mono carries the clock / timestamps / kickers. Latin Extended subset
// covers Czech diacritics.
const sourceSans = Source_Sans_3({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const bricolage = Bricolage_Grotesque({
  subsets: ["latin", "latin-ext"],
  variable: "--font-serif",
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin", "latin-ext"],
  variable: "--font-mono",
  weight: ["400", "500", "700"],
  display: "swap",
});

export default function RootLayout({ children }: RootLayoutProps) {
  const showEditorialDebug = process.env.NODE_ENV !== "production";
  // Only canonicalize the host on the production deployment. Preview
  // deployments (VERCEL_ENV="preview", e.g. branch builds like
  // *-git-design-visual-refresh-*.vercel.app) must stay on their own host so
  // visual changes can be reviewed before merging to main.
  const isProductionDeployment = process.env.VERCEL_ENV === "production";
  return (
    <html lang="cs" className={`${bricolage.variable} ${sourceSans.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-abj-main text-abj-text1 antialiased">
        {isProductionDeployment ? (
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
        ) : null}
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
          <main className="min-h-[calc(100vh-56px-46px)] pt-[56px] md:min-h-[calc(100vh-92px-46px)] md:pt-[92px]">
            {children}
          </main>
          <AppChrome>
            <LegalFooter />
            {showEditorialDebug ? <EditorialEventDebugPanel /> : null}
          </AppChrome>
        </AuthProvider>
      </body>
    </html>
  );
}
