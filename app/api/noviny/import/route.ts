import { revalidateTag } from "next/cache";

import { isCronAuthorized } from "@/lib/cronAuth";
import { runNovinyImport } from "@/lib/noviny/importer";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const report = await runNovinyImport({ runType: "cron" });
    revalidateTag("noviny-public", "max");

    const allFailed = report.totalSources > 0 && report.errorSources === report.totalSources;
    const statusCode = allFailed ? 503 : 200;

    return Response.json(
      {
        ok: !allFailed,
        report,
      },
      { status: statusCode },
    );
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Noviny import selhal.",
      },
      { status: 500 },
    );
  }
}
