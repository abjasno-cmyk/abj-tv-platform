import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type SessionSyncPayload = {
  accessToken?: unknown;
  refreshToken?: unknown;
};

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
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

function createRouteSupabaseClient(request: NextRequest) {
  const supabaseUrl = sanitizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseAnonKey = sanitizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase env vars not set");
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

  return {
    supabase,
    applyCookies(response: NextResponse) {
      cookiesToSet.forEach((cookie) => {
        response.cookies.set({
          name: cookie.name,
          value: cookie.value,
          ...(cookie.options ?? {}),
        });
      });
    },
  };
}

export async function POST(request: NextRequest) {
  const { supabase, applyCookies } = createRouteSupabaseClient(request);
  const payload = (await request.json().catch(() => ({}))) as SessionSyncPayload;
  const accessToken = asString(payload.accessToken);
  const refreshToken = asString(payload.refreshToken);
  if (!accessToken) {
    return NextResponse.json({ ok: false, error: "Missing access token." }, { status: 400 });
  }

  let syncMode: "full_session" | "access_only" = "access_only";
  let syncWarning: string | null = null;

  if (refreshToken) {
    const setResult = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (setResult.error) {
      syncWarning = setResult.error.message;
    } else {
      syncMode = "full_session";
    }
  }

  const response = NextResponse.json({
    ok: true,
    mode: syncMode,
    warning: syncWarning,
  });
  response.cookies.set("verox_access_token", encodeURIComponent(accessToken), {
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    secure: true,
    sameSite: "lax",
  });
  applyCookies(response);
  return response;
}

export async function DELETE(request: NextRequest) {
  const { supabase, applyCookies } = createRouteSupabaseClient(request);
  await supabase.auth.signOut();
  const response = NextResponse.json({ ok: true });
  response.cookies.set("verox_access_token", "", {
    path: "/",
    maxAge: 0,
    secure: true,
    sameSite: "lax",
  });
  applyCookies(response);
  return response;
}
