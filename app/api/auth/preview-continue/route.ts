import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

import {
  buildAuthCompleteUrl,
  createAuthHandoffToken,
  parsePreviewHandoffQuery,
  resolveProductionAuthOrigin,
} from "@/lib/auth/handoff";

export const dynamic = "force-dynamic";

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

/**
 * Fallback for legacy preview handoff redirects that landed here after OAuth.
 * Reads the session from production cookies and forwards it to the preview app.
 */
export async function GET(request: NextRequest) {
  const siteOrigin = resolveProductionAuthOrigin();
  const handoffTarget = parsePreviewHandoffQuery(request.nextUrl.searchParams);

  if (!handoffTarget) {
    return NextResponse.redirect(new URL("/live?auth_error=preview_handoff", siteOrigin));
  }

  const supabaseUrl = sanitizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseAnonKey = sanitizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.redirect(new URL("/live?auth_error=preview_handoff", siteOrigin));
  }

  const cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }> = [];
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(nextCookies) {
        cookiesToSet.push(...nextCookies);
      },
    },
  });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token || !session.refresh_token) {
    return NextResponse.redirect(new URL("/live?auth_error=signin", siteOrigin));
  }

  const handoff = createAuthHandoffToken({
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    returnOrigin: handoffTarget.returnOrigin,
    returnPath: handoffTarget.returnPath,
  });

  const response = NextResponse.redirect(
    buildAuthCompleteUrl(handoffTarget.returnOrigin, handoff),
  );
  cookiesToSet.forEach((cookie) => {
    response.cookies.set({
      name: cookie.name,
      value: cookie.value,
      ...(cookie.options ?? {}),
    });
  });
  return response;
}
