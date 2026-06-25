import { revalidateTag } from "next/cache";

import { isCronAuthorized } from "@/lib/cronAuth";
import { isNovinyEnrichmentEnabled, runNovinyEnrichmentWorker } from "@/lib/noviny/enrichment";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isNovinyEnrichmentEnabled()) {
    return Response.json({ ok: true, skipped: true, reason: "NOVINY_ENRICHMENT_ENABLED=false" });
  }

  try {
    const report = await runNovinyEnrichmentWorker(8);
    revalidateTag("noviny-public", "max");
    return Response.json({ ok: true, report });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "Enrichment worker selhal." },
      { status: 500 },
    );
  }
}
