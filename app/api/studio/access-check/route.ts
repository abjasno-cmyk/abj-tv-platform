import { NextResponse } from "next/server";

import { resolveStudioAccessContext, STUDIO_ALLOWED_EMAILS } from "@/lib/studio/access";

export const dynamic = "force-dynamic";

export async function GET() {
  const access = await resolveStudioAccessContext();
  if (!access.user) {
    return NextResponse.json(
      {
        ok: false,
        reason: "not_authenticated",
        message: "Uživatel není přihlášen.",
      },
      { status: 401 },
    );
  }

  return NextResponse.json({
    ok: access.canAccessStudio,
    reason: access.canAccessStudio ? "granted" : "denied",
    user: {
      id: access.user.id,
      email: access.email,
      displayName: access.displayName,
      profileRole: access.profileRole,
      effectiveRoles: access.effectiveRoles,
      isAllowlisted: access.isAllowlisted,
      canAccessStudio: access.canAccessStudio,
    },
    allowlist: Array.from(STUDIO_ALLOWED_EMAILS).sort(),
  });
}
