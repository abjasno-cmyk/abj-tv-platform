type AdminAuthResult =
  | {
      ok: true;
      moderator: string;
    }
  | {
      ok: false;
      status: number;
      error: string;
    };

function resolveAdminSecret(): string | null {
  const candidates = [
    process.env.WALL_ADMIN_SECRET,
    process.env.ADMIN_SECRET,
    process.env.PROGRAM_CACHE_CRON_SECRET,
    process.env.CRON_SECRET,
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const trimmed = candidate.trim();
    if (trimmed.length > 0) return trimmed;
  }
  return null;
}

export function requireWallAdmin(request: Request): AdminAuthResult {
  const configured = resolveAdminSecret();
  if (!configured) {
    // TODO: Replace with project-wide admin auth/session middleware.
    return {
      ok: false,
      status: 503,
      error: "Admin auth is not configured. Set WALL_ADMIN_SECRET.",
    };
  }

  const authHeader = request.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : null;
  const direct = request.headers.get("x-admin-secret")?.trim() ?? null;
  const urlSecret = new URL(request.url).searchParams.get("secret");
  const provided = bearer ?? direct ?? urlSecret;
  if (!provided || provided !== configured) {
    return {
      ok: false,
      status: 401,
      error: "Unauthorized admin request.",
    };
  }

  const moderator = request.headers.get("x-admin-user")?.trim() || "admin";
  return { ok: true, moderator };
}

