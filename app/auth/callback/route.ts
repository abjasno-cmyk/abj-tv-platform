import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

import {
  buildAuthCompleteUrl,
  createAuthHandoffToken,
  parsePreviewHandoffNext,
} from "@/lib/auth/handoff";
import { resolveAuthCallbackOrigin } from "@/lib/site";

export const dynamic = "force-dynamic";

function safeNextPath(value: string | null): string {
  if (!value?.trim()) return "/live";
  const trimmed = value.trim();
  if (parsePreviewHandoffNext(trimmed)) return trimmed;
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return "/live";
  return trimmed;
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

function applyAuthCookies(
  response: NextResponse,
  cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>,
) {
  cookiesToSet.forEach((cookie) => {
    response.cookies.set({
      name: cookie.name,
      value: cookie.value,
      ...(cookie.options ?? {}),
    });
  });
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNextPath(url.searchParams.get("next"));
  const origin = resolveAuthCallbackOrigin(url);
  const previewHandoff = parsePreviewHandoffNext(next);
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

      if (previewHandoff) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.access_token && session.refresh_token) {
          const handoff = createAuthHandoffToken({
            accessToken: session.access_token,
            refreshToken: session.refresh_token,
            returnOrigin: previewHandoff.returnOrigin,
            returnPath: previewHandoff.returnPath,
          });
          const response = NextResponse.redirect(
            buildAuthCompleteUrl(previewHandoff.returnOrigin, handoff),
          );
          applyAuthCookies(response, cookiesToSet);
          return response;
        }
      }
    } catch (error) {
      const target = new URL(`${origin}${next}`);
      target.searchParams.set("auth_sync_error", "1");
      target.searchParams.set("auth_sync_message", error instanceof Error ? error.message : "OAuth exchange failed");
      const response = NextResponse.redirect(target);
      applyAuthCookies(response, cookiesToSet);
      return response;
    }
  }

  const response = NextResponse.redirect(`${origin}${next}`);
  applyAuthCookies(response, cookiesToSet);
  return response;
}
