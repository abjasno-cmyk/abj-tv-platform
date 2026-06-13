import { NextResponse } from "next/server";

import { hasStudioCapability, resolveStudioAccessContext } from "@/lib/studio/access";

export async function requireStudioSourcesAdmin() {
  const access = await resolveStudioAccessContext();

  if (!access.user) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Pro správu kanálů se přihlaste přes Google." }, { status: 401 }),
    };
  }

  if (!access.canAccessStudio) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Tato stránka je dostupná pouze pro schválené studio účty." }, { status: 403 }),
    };
  }

  if (!hasStudioCapability(access, "video_channel_edit")) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Nemáte oprávnění spravovat kanály." }, { status: 403 }),
    };
  }

  return { ok: true as const, access };
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

export function requiredYoutubeApiKey(): string {
  const value = sanitizeEnvValue(process.env.YOUTUBE_API_KEY);
  if (!value) {
    throw new Error("YOUTUBE_API_KEY not set");
  }
  return value;
}
