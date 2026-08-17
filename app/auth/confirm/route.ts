import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

import { sanitizeOAuthReturnPath } from "@/lib/auth/oauthRedirect";
import { resolveAuthCallbackOrigin } from "@/lib/site";

// Cíl odkazů z e-mailů (šablony používají {{ .TokenHash }}): divák vidí jen
// verox.cz URL, žádný *.supabase.co. Token ověříme server-side přes verifyOtp,
// session uložíme do cookies a přesměrujeme dál (reset hesla → /auth/nove-heslo).
export const dynamic = "force-dynamic";

const ALLOWED_TYPES: ReadonlySet<string> = new Set([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

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

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash")?.trim();
  const rawType = url.searchParams.get("type")?.trim() ?? "";
  const next = sanitizeOAuthReturnPath(url.searchParams.get("next")?.trim() || "/live");
  const origin = resolveAuthCallbackOrigin(url);

  const failureTarget = new URL(`${origin}/live`);
  failureTarget.searchParams.set("auth_sync_error", "1");
  failureTarget.searchParams.set("auth_sync_message", "Odkaz je neplatný nebo vypršel.");

  if (!tokenHash || !ALLOWED_TYPES.has(rawType)) {
    return NextResponse.redirect(failureTarget);
  }

  const supabaseUrl = sanitizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseAnonKey = sanitizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.redirect(failureTarget);
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

  const { error } = await supabase.auth.verifyOtp({
    type: rawType as EmailOtpType,
    token_hash: tokenHash,
  });

  const response = NextResponse.redirect(error ? failureTarget : new URL(`${origin}${next}`));
  cookiesToSet.forEach((cookie) => {
    response.cookies.set({ name: cookie.name, value: cookie.value, ...(cookie.options ?? {}) });
  });
  return response;
}
