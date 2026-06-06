import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

import {
  buildAuthCompleteUrl,
  createAuthHandoffToken,
  parsePreviewHandoffNext,
  parsePreviewHandoffRequest,
} from "@/lib/auth/handoff";
import { OAUTH_RETURN_PATH_COOKIE, sanitizeOAuthReturnPath } from "@/lib/auth/oauthRedirect";
import { resolveAuthCallbackOrigin } from "@/lib/site";

export const dynamic = "force-dynamic";

function readNextPath(request: NextRequest, queryValue: string | null): string {
  if (queryValue?.trim()) {
    const trimmed = queryValue.trim();
    if (parsePreviewHandoffNext(trimmed)) return trimmed;
    return sanitizeOAuthReturnPath(trimmed);
  }

  const cookieValue = request.cookies.get(OAUTH_RETURN_PATH_COOKIE)?.value;
  if (cookieValue) {
    try {
      return sanitizeOAuthReturnPath(decodeURIComponent(cookieValue));
    } catch {
      return sanitizeOAuthReturnPath(cookieValue);
    }
  }

  return "/live";
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
  const next = readNextPath(request, url.searchParams.get("next"));
  const origin = resolveAuthCallbackOrigin(url);
  const previewHandoff = parsePreviewHandoffRequest(url.searchParams, next);
  const cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }> = [];

  const supabaseUrl = sanitizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseAnonKey = sanitizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (code) {
    try {
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
          response.cookies.set(OAUTH_RETURN_PATH_COOKIE, "", { path: "/", maxAge: 0 });
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
  response.cookies.set(OAUTH_RETURN_PATH_COOKIE, "", { path: "/", maxAge: 0 });
  applyAuthCookies(response, cookiesToSet);
  return response;
}
