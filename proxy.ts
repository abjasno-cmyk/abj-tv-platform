import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { PRODUCTION_LEGACY_VERCEL_HOST } from "@/lib/deploymentHost";
import { isApiPathAllowed, isPageAllowed, moduleEnabled } from "@/lib/tenant";

// Cesty, které volají Vercel crony server-to-server (bez prohlížeče, tedy bez
// Basic Auth hlavičky). Chráněné vlastním CRON_SECRET. Jen tyto smí obejít
// staging Basic Auth — NE celé /api/ (jinak je engine proxy veřejná, viz
// security audit 8.8.).
const CRON_PATHS: ReadonlyArray<string> = [
  "/api/program/v3/refresh-cache",
  "/api/program/v3/import-feed",
  "/api/program/v3/sync-channel-ids",
  "/api/noviny/import",
  "/api/noviny/context/analyze",
  "/api/noviny/enrich",
];

function sanitizeEnvValue(value?: string): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  const equalsIdx = trimmed.indexOf("=");
  const maybeAssigned =
    equalsIdx > 0 && /^[A-Z0-9_]+$/.test(trimmed.slice(0, equalsIdx))
      ? trimmed.slice(equalsIdx + 1).trim()
      : trimmed;
  if (
    (maybeAssigned.startsWith('"') && maybeAssigned.endsWith('"')) ||
    (maybeAssigned.startsWith("'") && maybeAssigned.endsWith("'"))
  ) {
    return maybeAssigned.slice(1, -1).trim();
  }
  return maybeAssigned;
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Vertikála s vypnutými moduly: jejich API cesty nesmí být dosažitelné ani
  // přes /api (stránky jsou 404, ale API routy jdou přímo na sdílenou DB přes
  // service_role — bez tohoto gate umí ProudX zapisovat do VEROX Zdi apod.).
  if (!isApiPathAllowed(pathname)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  // Staging/beta deployment (dev.proudx.cz): celý web za HTTP Basic Auth.
  // Aktivuje se jen nastavením DEV_BASIC_AUTH_PASSWORD na deploymentu;
  // produkce a preview bez env běží beze změny. Vyňaté jsou JEN cron cesty
  // (server-to-server, chráněné CRON_SECRET) — ne celé /api/.
  const devPassword = process.env.DEV_BASIC_AUTH_PASSWORD;
  if (devPassword && !CRON_PATHS.includes(pathname)) {
    const expected = `Basic ${btoa(`proudx:${devPassword}`)}`;
    if (request.headers.get("authorization") !== expected) {
      return new NextResponse("Authentication required", {
        status: 401,
        headers: { "WWW-Authenticate": 'Basic realm="ProudX dev"' },
      });
    }
  }

  // Stránky vypnutých modulů nesmí být na této vertikále dosažitelné.
  // ponytail: plaintext 404 stačí — hezčí 404 stránka až s brand fází.
  if (!isPageAllowed(pathname)) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const requestHost = request.nextUrl.host.toLowerCase();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-verox-host", requestHost);
  requestHeaders.set("x-verox-pathname", request.nextUrl.pathname);
  const shouldRewriteEnglishPath =
    request.nextUrl.pathname === "/en" || request.nextUrl.pathname.startsWith("/en/");
  const rewriteUrl = request.nextUrl.clone();
  if (shouldRewriteEnglishPath) {
    rewriteUrl.pathname = request.nextUrl.pathname === "/en" ? "/live" : request.nextUrl.pathname.replace(/^\/en(?=\/|$)/, "") || "/live";
  }
  const makePassThroughResponse = () =>
    shouldRewriteEnglishPath
      ? NextResponse.rewrite(rewriteUrl, {
          request: {
            headers: requestHeaders,
          },
        })
      : NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        });
  // Cron endpointy NESMÍ být kanonikalizované: Vercel cron fíruje proti generovanému
  // deployment URL a redirecty NEnásleduje (Vercel docs) — 307 by cron zabil. Necháme
  // je doběhnout na endpoint (auth řeší CRON_SECRET, ne host).
  const isCronPath = request.nextUrl.pathname.startsWith("/api/program/v3/");
  // Canonicalize only on the production deployment. NODE_ENV is "production"
  // on every Vercel build (preview included), so gating on it bounced preview
  // deployments to prod and made branch visual review impossible. VERCEL_ENV
  // is "preview" on preview deployments and "production" only on production.
  const shouldCanonicalizeHost =
    !isCronPath &&
    process.env.VERCEL_ENV === "production" &&
    /^abj-tv-platform-n7e8(?:-[a-z0-9-]+)?\.vercel\.app$/i.test(requestHost) &&
    !requestHost.includes("-git-") &&
    requestHost !== PRODUCTION_LEGACY_VERCEL_HOST;

  if (shouldCanonicalizeHost) {
    const canonicalUrl = request.nextUrl.clone();
    canonicalUrl.protocol = "https";
    canonicalUrl.host = PRODUCTION_LEGACY_VERCEL_HOST;
    return NextResponse.redirect(canonicalUrl, 307);
  }

  // Vertikála bez přihlašování (ProudX MVP) nesmí zakládat ani obnovovat
  // auth session cookies — žádné sdílené profily mezi vertikálami.
  if (!moduleEnabled("auth")) {
    return NextResponse.next({ request });
  }

  const supabaseUrl = sanitizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseAnonKey = sanitizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!supabaseUrl || !supabaseAnonKey) {
    return makePassThroughResponse();
  }

  let response = makePassThroughResponse();

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = makePassThroughResponse();
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // Refresh or persist auth cookie state for SSR routes.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js|map)$).*)",
  ],
};
