import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

import { CANONICAL_HOST, LEGACY_VERCEL_HOST_PATTERN } from "@/lib/site";

export const dynamic = "force-dynamic";

function safeNextPath(value: string | null): string {
  if (!value) return "/live";
  if (!value.startsWith("/")) return "/live";
  if (value.startsWith("//")) return "/live";
  return value;
}

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
  const code = url.searchParams.get("code");
  const next = safeNextPath(url.searchParams.get("next"));
  const requestHost = url.host.toLowerCase();
  const shouldCanonicalizeHost =
    LEGACY_VERCEL_HOST_PATTERN.test(requestHost) && requestHost !== CANONICAL_HOST;
  const origin = `${url.protocol}//${shouldCanonicalizeHost ? CANONICAL_HOST : url.host}`;
  const cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }> = [];

  if (code) {
    try {
      const supabaseUrl = sanitizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
      const supabaseAnonKey = sanitizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error("Supabase env vars not set");
      }
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
      await supabase.auth.exchangeCodeForSession(code);
    } catch (error) {
      const target = new URL(`${origin}${next}`);
      target.searchParams.set("auth_sync_error", "1");
      target.searchParams.set("auth_sync_message", error instanceof Error ? error.message : "OAuth exchange failed");
      const response = NextResponse.redirect(target);
      cookiesToSet.forEach((cookie) => {
        response.cookies.set({
          name: cookie.name,
          value: cookie.value,
          ...(cookie.options ?? {}),
        });
      });
      return response;
    }
  }

  const response = NextResponse.redirect(`${origin}${next}`);
  cookiesToSet.forEach((cookie) => {
    response.cookies.set({
      name: cookie.name,
      value: cookie.value,
      ...(cookie.options ?? {}),
    });
  });
  return response;
}
