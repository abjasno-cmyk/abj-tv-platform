import { revalidateTag } from "next/cache";

import { isCronAuthorized } from "@/lib/cronAuth";
import { runNovinyContextAnalysis } from "@/lib/noviny/contextLayer";
import { moduleEnabled } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!moduleEnabled("noviny")) {
    return Response.json({ ok: true, skipped: "noviny disabled for tenant" });
  }

  try {
    const report = await runNovinyContextAnalysis();
    revalidateTag("noviny-public", "max");
    return Response.json({ ok: report.failedArticles === 0, report }, { status: report.failedArticles === 0 ? 200 : 207 });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Kontextová analýza Novin selhala. Ověř prosím, že je nasazen SQL soubor 020.",
      },
      { status: 500 },
    );
  }
}
