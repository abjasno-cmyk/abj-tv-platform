import { NextResponse } from "next/server";

import { resolveStudioAccessContext, STUDIO_ALLOWED_EMAILS } from "@/lib/studio/access";

export const dynamic = "force-dynamic";
const PUBLIC_STUDIO_PREVIEW_ENABLED = true;

function parseCookieNames(cookieHeader: string | null): string[] {
  if (!cookieHeader) return [];
  return cookieHeader
    .split(";")
    .map((chunk) => chunk.trim().split("=")[0]?.trim())
    .filter((name): name is string => Boolean(name));
}

export async function GET(request: Request) {
  const access = await resolveStudioAccessContext();
  const url = new URL(request.url);
  const cookieNames = parseCookieNames(request.headers.get("cookie"));
  if (!access.user) {
    if (PUBLIC_STUDIO_PREVIEW_ENABLED) {
      return NextResponse.json({
        ok: true,
        reason: "public_preview",
        message: "Studio je dočasně dostupné v preview režimu bez přihlášení.",
        debug: {
          host: request.headers.get("host"),
          origin: request.headers.get("origin"),
          urlHost: url.host,
          cookieNames,
        },
      });
    }
    return NextResponse.json(
      {
        ok: false,
        reason: "not_authenticated",
        message: "Uživatel není přihlášen.",
        debug: {
          host: request.headers.get("host"),
          origin: request.headers.get("origin"),
          urlHost: url.host,
          cookieNames,
        },
      },
      { status: 401 },
    );
  }

  const accessGranted = PUBLIC_STUDIO_PREVIEW_ENABLED ? true : access.canAccessStudio;
  return NextResponse.json({
    ok: accessGranted,
    reason: access.canAccessStudio ? "granted" : PUBLIC_STUDIO_PREVIEW_ENABLED ? "public_preview" : "denied",
    user: {
      id: access.user.id,
      email: access.email,
      authProvider: access.authProvider,
      isGoogleAuth: access.isGoogleAuth,
      displayName: access.displayName,
      profileRole: access.profileRole,
      effectiveRoles: access.effectiveRoles,
      isAllowlisted: access.isAllowlisted,
      canAccessStudio: access.canAccessStudio,
    },
    allowlist: Array.from(STUDIO_ALLOWED_EMAILS).sort(),
    debug: {
      host: request.headers.get("host"),
      origin: request.headers.get("origin"),
      urlHost: url.host,
      cookieNames,
    },
  });
}
