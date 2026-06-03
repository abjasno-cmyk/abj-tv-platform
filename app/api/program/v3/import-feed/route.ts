import { revalidateTag } from "next/cache";

import {
  PROGRAM_FEED_CACHE_TAG,
  refreshProgramFeedImport,
} from "@/lib/programFeedImport";
import { isCronAuthorized } from "@/lib/cronAuth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await refreshProgramFeedImport();

    if (result.report.status !== "error") {
      revalidateTag(PROGRAM_FEED_CACHE_TAG, "max");
      revalidateTag("program-engine-v3", "max");
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
