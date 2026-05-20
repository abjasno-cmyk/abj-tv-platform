import { NextResponse } from "next/server";

import { resolveStudioAccessContext, STUDIO_ALLOWED_EMAILS } from "@/lib/studio/access";

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
  const cookieNames = parseCookieNames(request.headers.get("cookie"));
  if (!access.user) {
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
    debug: {
      host: request.headers.get("host"),
      origin: request.headers.get("origin"),
      urlHost: url.host,
      cookieNames,
    },
  });
}
