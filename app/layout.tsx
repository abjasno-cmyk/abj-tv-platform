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
import { getDictionary } from "@/lib/i18n/dictionary";
import { getRequestLocale } from "@/lib/i18n/server";
import { LOCALE_EN } from "@/lib/i18n/config";
import { CANONICAL_HOST, SITE_URL } from "@/lib/site";
import { TENANT } from "@/lib/tenant";

// Ikony a og/twitter obrázky jdou z tenant configu (ne z file-convention
// app/icon.svg apod.), aby vertikály nesdílely cizí brand assety. Texty:
// VEROX lokalizovaně přes dictionary (cs/en mirror), ostatní vertikály
// z tenant configu. Google site verification token per deployment přes env.
const googleSiteVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim();

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const dictionary = getDictionary(locale);
  const isVerox = TENANT.id === "verox";
  const siteUrl =
    isVerox && locale === LOCALE_EN
      ? process.env.VEROX_EN_SITE_URL?.trim() || "https://www.veroxmed.com"
      : SITE_URL;
  const title = isVerox ? dictionary.metadata.title : TENANT.title;
  const description = isVerox ? dictionary.metadata.description : TENANT.description;

  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    ...(googleSiteVerification ? { verification: { google: googleSiteVerification } } : {}),
    icons: {
      icon: TENANT.iconSrc,
      apple: TENANT.iconSrc,
    },
    openGraph: {
      type: "website",
      siteName: TENANT.siteName,
      title,
      description,
      ...(TENANT.ogImageSrc ? { images: [TENANT.ogImageSrc] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(TENANT.ogImageSrc ? { images: [TENANT.ogImageSrc] } : {}),
    },
  };
}

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

export default async function RootLayout({ children }: RootLayoutProps) {
  const locale = await getRequestLocale();
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
      lang={locale}
      className={`${montserrat.variable} ${robotoCondensed.variable}`}
      data-vercel-env={process.env.VERCEL_ENV ?? ""}
      data-tenant={TENANT.id}
      data-locale={locale}
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
            <ABJNav locale={locale} />
            <main className="min-h-[50vh]">{children}</main>
            <LegalFooter locale={locale} />
            {showEditorialDebug ? <EditorialEventDebugPanel /> : null}
          </TranscriptStatesProvider>
        </AuthProvider>
        {isProductionDeployment ? <Analytics /> : null}
      </body>
    </html>
  );
}
