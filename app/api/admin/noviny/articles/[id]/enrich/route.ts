import { revalidateTag } from "next/cache";

import { AuthApiError, requireAuthenticatedUser } from "@/lib/supabase/authenticated-server";
import { requireNovinyAdmin } from "@/lib/noviny/access";
import { enrichNovinyArticleById, isNovinyEnrichmentEnabled } from "@/lib/noviny/enrichment";
import { enforceWriteRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const limited = enforceWriteRateLimit(request, "admin-noviny-article-enrich");
    if (limited) return limited;

    const { supabase, user } = await requireAuthenticatedUser();
    await requireNovinyAdmin(supabase, user);
    if (!isNovinyEnrichmentEnabled()) {
      return Response.json({ error: "Article enrichment je vypnutý feature flagem." }, { status: 503 });
    }

    const { id } = await params;
    const result = await enrichNovinyArticleById(id, { force: true });
    revalidateTag("noviny-public", "max");
    return Response.json({ result });
  } catch (error) {
    if (error instanceof AuthApiError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json(
      { error: error instanceof Error ? error.message : "Obohacení článku selhalo." },
      { status: 500 },
    );
  }
}
