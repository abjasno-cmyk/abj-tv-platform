import { NextResponse } from "next/server";

import { resolveStudioAccessContext, STUDIO_ALLOWED_EMAILS } from "@/lib/studio/access";
import { getStudioGateCookieName, isStudioGateTokenValid, readCookieValueFromHeader } from "@/lib/studio/gate";

export const dynamic = "force-dynamic";

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
  const cookieHeader = request.headers.get("cookie");
  const cookieNames = parseCookieNames(cookieHeader);
  const gateCookieValue = readCookieValueFromHeader(cookieHeader, getStudioGateCookieName());
  const gateUnlocked = isStudioGateTokenValid(gateCookieValue);

  if (!gateUnlocked) {
    return NextResponse.json(
      {
        ok: false,
        reason: "studio_gate_required",
        message: "Studio vyžaduje přihlašovací údaj a heslo.",
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

  if (!access.user) {
    return NextResponse.json({
      ok: true,
      reason: "gate_only",
      message: "Studio je odemčeno přes údaj/heslo.",
      debug: {
        host: request.headers.get("host"),
        origin: request.headers.get("origin"),
        urlHost: url.host,
        cookieNames,
      },
    });
  }

  const accessGranted = access.canAccessStudio;
  return NextResponse.json({
    ok: accessGranted,
    reason: access.canAccessStudio ? "granted" : "denied",
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
