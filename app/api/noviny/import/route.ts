import { revalidateTag } from "next/cache";

import { isCronAuthorized } from "@/lib/cronAuth";
import { runNovinyImport } from "@/lib/noviny/importer";
import { moduleEnabled } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // vercel.json (a tedy crony) sdílí všechny vertikály — deployment bez
  // modulu noviny musí cron tiše potvrdit (200), jinak Vercel hlásí selhání.
  if (!moduleEnabled("noviny")) {
    return Response.json({ ok: true, skipped: "noviny disabled for tenant" });
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
