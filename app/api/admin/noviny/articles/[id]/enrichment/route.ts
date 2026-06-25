import { revalidateTag } from "next/cache";

import { AuthApiError, requireAuthenticatedUser } from "@/lib/supabase/authenticated-server";
import { requireNovinyAdmin } from "@/lib/noviny/access";
import { createNovinyServiceClient } from "@/lib/noviny/repository";
import { enforceWriteRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

type EnrichmentPatchPayload = {
  aiStatus?: unknown;
};

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const limited = enforceWriteRateLimit(request, "admin-noviny-article-enrichment-update");
    if (limited) return limited;

    const { supabase, user } = await requireAuthenticatedUser();
    await requireNovinyAdmin(supabase, user);

    const { id } = await params;
    const payload = (await request.json().catch(() => ({}))) as EnrichmentPatchPayload;
    const aiStatus = typeof payload.aiStatus === "string" ? payload.aiStatus.trim() : "";
    if (aiStatus !== "approved" && aiStatus !== "rejected") {
      return Response.json({ error: "aiStatus musí být approved nebo rejected." }, { status: 400 });
    }

    const service = createNovinyServiceClient();
    const { data, error } = await service
      .from("noviny_article_enrichment")
      .update({ ai_status: aiStatus })
      .eq("article_id", id)
      .select("id,article_id,ai_status")
      .single();
    if (error) {
      return Response.json({ error: "Stav enrichmentu se nepodařilo upravit." }, { status: 500 });
    }
    revalidateTag("noviny-public", "max");
    return Response.json({ enrichment: data });
  } catch (error) {
    if (error instanceof AuthApiError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json(
      { error: error instanceof Error ? error.message : "Stav enrichmentu se nepodařilo upravit." },
      { status: 500 },
    );
  }
}
