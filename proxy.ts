import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { PRODUCTION_LEGACY_VERCEL_HOST } from "@/lib/deploymentHost";

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
  const requestHost = request.nextUrl.host.toLowerCase();
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

  const supabaseUrl = sanitizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseAnonKey = sanitizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next({
      request,
    });
  }

  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({
          request,
        });
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
