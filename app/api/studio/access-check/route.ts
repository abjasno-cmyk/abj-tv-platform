import { NextResponse } from "next/server";

import { resolveStudioAccessContext } from "@/lib/studio/access";
import { getStudioGateCookieName, isStudioGateTokenValid, readCookieValueFromHeader } from "@/lib/studio/gate";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const access = await resolveStudioAccessContext();
  const cookieHeader = request.headers.get("cookie");
  const gateCookieValue = readCookieValueFromHeader(cookieHeader, getStudioGateCookieName());
  const gateUnlocked = isStudioGateTokenValid(gateCookieValue);

  if (!gateUnlocked) {
    return NextResponse.json(
      {
        ok: false,
        reason: "studio_gate_required",
        message: "Studio vyžaduje přihlašovací údaj a heslo.",
      },
      { status: 401 },
    );
  }

  if (!access.user) {
    return NextResponse.json({
      ok: true,
      reason: "gate_only",
      message: "Studio je odemčeno přes údaj/heslo.",
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
  });
}
