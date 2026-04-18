import { refreshVideoCache } from "@/lib/fetchVideos";
import { refreshProgramFeedImport } from "@/lib/programFeedImport";
import { createClient } from "@supabase/supabase-js";
import { revalidateTag } from "next/cache";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
  const configured = process.env.PROGRAM_CACHE_CRON_SECRET ?? process.env.CRON_SECRET;
  if (!configured) return true;

  const authHeader = request.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : null;
  const urlSecret = new URL(request.url).searchParams.get("secret");
  return bearer === configured || urlSecret === configured;
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

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = new Date().toISOString();
  let programFeedImport = null;
  try {
    programFeedImport = await refreshProgramFeedImport();
    if (programFeedImport.report.status !== "error") {
      revalidateTag("program-feed-import");
      revalidateTag("program-engine-v3");
    }
    const result = await refreshVideoCache();

    try {
      const supabaseUrl = sanitizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
      const supabaseAnonKey = sanitizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
      if (supabaseUrl && supabaseAnonKey) {
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        const status =
          result.failedSources.length === 0
            ? "success"
            : result.stored > 0
              ? "running"
              : "failed";
        const errorText =
          result.failedDetails.length > 0
            ? result.failedDetails
                .slice(0, 8)
                .map((item) => `${item.source}: ${item.error}`)
                .join(" | ")
            : null;

        const { error } = await supabase.from("ingest_runs").insert({
          started_at: startedAt,
          finished_at: new Date().toISOString(),
          status,
          api_calls: result.apiCalls,
          videos_upserted: result.stored,
          error_text: errorText,
        });
        if (error) {
          console.warn("refresh-cache ingest_runs insert failed:", error.message);
        }
      }
    } catch (logError) {
      console.warn("refresh-cache ingest logging failed:", logError);
    }

    return Response.json({
      ok: true,
      refreshedAt: new Date().toISOString(),
      programFeedImport,
      apiCalls: result.apiCalls,
      videosStored: result.stored,
      failedSources: result.failedSources,
      failedDetails: result.failedDetails,
    });
  } catch (error) {
    console.error("refresh-cache route failed", error);
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown refresh error",
      },
      { status: 500 }
    );
  }
}
