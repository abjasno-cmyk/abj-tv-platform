import { getProgramHealth } from "@/lib/programHealth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const health = await getProgramHealth();
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
