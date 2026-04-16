import { refreshVideoCache } from "@/lib/fetchVideos";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
  const configured = process.env.PROGRAM_CACHE_CRON_SECRET ?? process.env.CRON_SECRET;
  if (!configured) return true;

  const authHeader = request.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : null;
  const urlSecret = new URL(request.url).searchParams.get("secret");
  return bearer === configured || urlSecret === configured;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await refreshVideoCache();
    return Response.json({
      ok: true,
      refreshedAt: new Date().toISOString(),
      apiCalls: result.apiCalls,
      videosStored: result.stored,
      failedSources: result.failedSources,
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
