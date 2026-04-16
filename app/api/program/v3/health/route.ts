import { getProgramHealth } from "@/lib/programHealth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const probe = url.searchParams.get("probe") === "1";
    const health = await getProgramHealth({ probeYouTube: probe });
    const statusCode =
      health.overallStatus === "error" ? 503 : health.overallStatus === "warning" ? 200 : 200;
    return Response.json(health, { status: statusCode });
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
