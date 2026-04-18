import { revalidateTag } from "next/cache";

import {
  PROGRAM_FEED_CACHE_TAG,
  refreshProgramFeedImport,
} from "@/lib/programFeedImport";

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
    const result = await refreshProgramFeedImport();

    if (result.report.status !== "error") {
      revalidateTag(PROGRAM_FEED_CACHE_TAG);
      revalidateTag("program-engine-v3");
    }

    const statusCode = result.report.status === "error" ? 503 : 200;
    return Response.json(
      {
        ok: result.report.status !== "error",
        report: result.report,
        importedItems: result.manualSchedule.length,
      },
      { status: statusCode }
    );
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown import-feed error",
      },
      { status: 500 }
    );
  }
}
