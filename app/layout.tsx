import type { Metadata } from "next";
import { Inter, Montserrat } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ABJNav } from "@/components/abj/Nav";
import { LegalFooter } from "@/components/abj/LegalFooter";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { EditorialEventDebugPanel } from "@/components/dev/EditorialEventDebugPanel";
import { StudioFab } from "@/components/studio/StudioFab";

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
        <Script id="verox-access-token-cookie-sync" strategy="beforeInteractive">
          {`
            (function () {
              try {
                var keyPattern = /^sb-[a-z0-9]+-auth-token$/i;
                var token = null;
                for (var i = 0; i < localStorage.length; i += 1) {
                  var key = localStorage.key(i);
                  if (!key || !keyPattern.test(key)) continue;
                  var raw = localStorage.getItem(key);
                  if (!raw) continue;
                  try {
                    var parsed = JSON.parse(raw);
                    if (parsed && typeof parsed.access_token === "string" && parsed.access_token.length > 20) {
                      token = parsed.access_token;
                      break;
                    }
                    if (
                      parsed &&
                      parsed.currentSession &&
                      typeof parsed.currentSession.access_token === "string" &&
                      parsed.currentSession.access_token.length > 20
                    ) {
                      token = parsed.currentSession.access_token;
                      break;
                    }
                  } catch (_err) {
                    var match = raw.match(/"access_token"\\s*:\\s*"([^"]+)"/);
                    if (match && match[1] && match[1].length > 20) {
                      token = match[1];
                      break;
                    }
                  }
                }
                if (token) {
                  document.cookie =
                    "verox_access_token=" +
                    encodeURIComponent(token) +
                    "; Path=/; Max-Age=31536000; SameSite=Lax; Secure";
                }
              } catch (_err) {
                // Ignore sync failures.
              }
            })();
          `}
        </Script>
        <AuthProvider>
          {/* Single global nav only — prevents duplicate legacy header stacks. */}
          <ABJNav />
          <main className="min-h-[calc(100vh-46px)] pt-[68px]">{children}</main>
          <LegalFooter />
          <StudioFab />
          {showEditorialDebug ? <EditorialEventDebugPanel /> : null}
        </AuthProvider>
      </body>
    </html>
  );
}
