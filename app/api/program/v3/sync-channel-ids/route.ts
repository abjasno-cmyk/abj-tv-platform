import { syncSourceChannelIds } from "@/lib/syncSourceChannelIds";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { isCronAuthorized } from "@/lib/cronAuth";

export const dynamic = "force-dynamic";

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

function requiredEnv(name: string): string {
  const value = sanitizeEnvValue(process.env[name]);
  if (!value) {
    throw new Error(`${name} not set`);
  }
  return value;
}

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode") === "all" ? "all" : "missing";

  try {
    const supabase = createSupabaseServiceClient();
    const result = await syncSourceChannelIds({
      supabase,
      youtubeApiKey: requiredEnv("YOUTUBE_API_KEY"),
      mode,
    });

    return Response.json({
      ok: true,
      mode,
      syncedAt: new Date().toISOString(),
      ...result,
      details: result.details.slice(0, 40),
    });
  } catch (error) {
    console.error("sync-channel-ids failed", error);
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown sync error",
      },
      { status: 500 }
    );
  }
}
