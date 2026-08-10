import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import { Montserrat, Roboto_Condensed } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import "./live/verox.css";
import "./live/handoff.css";
import "./live/tenant-proudx.css";
import { ABJNav } from "@/components/abj/Nav";
import { LegalFooter } from "@/components/abj/LegalFooter";
import { SitePresenceReporter } from "@/components/abj/SitePresenceReporter";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { TranscriptStatesProvider } from "@/components/viewer/TranscriptStatesProvider";
import { EditorialEventDebugPanel } from "@/components/dev/EditorialEventDebugPanel";
import { CANONICAL_HOST, SITE_URL } from "@/lib/site";
import { TENANT } from "@/lib/tenant";

// Ikony a og/twitter obrázky jdou z tenant configu (ne z file-convention
// app/icon.svg apod.), aby vertikály nesdílely cizí brand assety.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TENANT.title,
  description: TENANT.description,
  icons: {
    icon: TENANT.iconSrc,
    apple: TENANT.iconSrc,
  },
  openGraph: {
    type: "website",
    siteName: TENANT.siteName,
    title: TENANT.title,
    description: TENANT.description,
    ...(TENANT.ogImageSrc ? { images: [TENANT.ogImageSrc] } : {}),
  },
  twitter: {
    card: "summary_large_image",
    title: TENANT.title,
    description: TENANT.description,
    ...(TENANT.ogImageSrc ? { images: [TENANT.ogImageSrc] } : {}),
  },
};

type RootLayoutProps = {
  children: React.ReactNode;
};

// Final approved design (verox-html-handoff): Roboto Condensed for everything,
// incl. heavy display headings (weight 900). Latin Extended carries Czech/Slovak.
const robotoCondensed = Roboto_Condensed({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
  weight: ["400", "500", "700", "900"],
  display: "swap",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-serif",
  weight: ["600", "700", "800"],
});

export default function RootLayout({ children }: RootLayoutProps) {
  const showEditorialDebug = process.env.NODE_ENV !== "production";
  // Only canonicalize the host on the production deployment. Preview
  // deployments (VERCEL_ENV="preview", e.g. branch builds like
  // *-git-design-visual-refresh-*.vercel.app) must stay on their own host so
  // visual changes can be reviewed before merging to main.
  const isProductionDeployment = process.env.VERCEL_ENV === "production";
  // Oba inline skripty jsou VEROX-specifické (canonical host, legacy auth
  // cookie) — na jiné vertikále by jen prozrazovaly společný codebase.
  const isVeroxTenant = TENANT.id === "verox";
  return (
    <html
      lang="cs"
      className={`${montserrat.variable} ${robotoCondensed.variable}`}
      data-vercel-env={process.env.VERCEL_ENV ?? ""}
      data-tenant={TENANT.id}
    >
      <body className="min-h-screen bg-abj-main text-abj-text1 antialiased">
        {isProductionDeployment && isVeroxTenant ? (
          <Script id="verox-canonical-host-guard" strategy="beforeInteractive">
            {`
            (function () {
              try {
                var canonicalHost = "${CANONICAL_HOST}";
                var host = window.location.host.toLowerCase();
                var productionVercelHost = "abj-tv-platform-n7e8.vercel.app";
                if (host.indexOf("-git-") !== -1) return;
                if (host === productionVercelHost && host !== canonicalHost) {
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
        {isVeroxTenant ? (
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
        ) : null}
        <SitePresenceReporter />
        <AuthProvider vercelEnv={process.env.VERCEL_ENV}>
          <TranscriptStatesProvider>
            {/* Single global nav only — prevents duplicate legacy header stacks. */}
            <ABJNav />
            <main className="min-h-[50vh]">{children}</main>
            <LegalFooter />
            {showEditorialDebug ? <EditorialEventDebugPanel /> : null}
          </TranscriptStatesProvider>
        </AuthProvider>
        {isProductionDeployment ? <Analytics /> : null}
      </body>
    </html>
  );
}
