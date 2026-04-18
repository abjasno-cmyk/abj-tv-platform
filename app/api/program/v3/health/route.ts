import { getProgramHealth } from "@/lib/programHealth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const probe = url.searchParams.get("probe") === "1";
    const includeFeedImport = url.searchParams.get("includeFeedImport") === "1";
    const health = await getProgramHealth({ probeYouTube: probe });
    const enriched = includeFeedImport ? await attachProgramFeedImport(health) : health;
    const feedImportStatus =
      enriched && typeof enriched === "object" && "programFeedImport" in enriched
        ? (enriched as { programFeedImport?: { status?: string } }).programFeedImport?.status
        : undefined;
    const statusCode =
      enriched.overallStatus === "error" || feedImportStatus === "error"
        ? 503
        : enriched.overallStatus === "warning" || feedImportStatus === "warning"
          ? 200
          : 200;
    return Response.json(enriched, { status: statusCode });
  } catch (error) {
    console.error("program-v3-health failed", error);
    return Response.json(
      {
        overallStatus: "error",
        error: error instanceof Error ? error.message : "Unknown health error",
      },
      { status: 500 }
    );
  }
}

async function attachProgramFeedImport(health: Awaited<ReturnType<typeof getProgramHealth>>) {
  try {
    const { getProgramFeedImport } = await import("@/lib/programFeedImport");
    const programFeedImport = await getProgramFeedImport();
    return {
      ...health,
      programFeedImport: programFeedImport.report,
    };
  } catch (error) {
    return {
      ...health,
      programFeedImport: {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown import health error",
      },
    };
  }
}
