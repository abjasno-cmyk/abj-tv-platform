import { after } from "next/server";

import { AuthApiError, requireAuthenticatedUser } from "@/lib/supabase/authenticated-server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { isNazoryAdmin, requireAuthorWithCompletedProfile } from "@/lib/nazory/access";
import { getArticleById, publishArticle } from "@/lib/nazory/articles";
import { translateAndStoreOpinionArticle } from "@/lib/nazory/autoTranslation";
import { enforceWriteRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const limited = enforceWriteRateLimit(request, "nazory-publish");
    if (limited) return limited;

    const { id } = await context.params;
    const { supabase, user } = await requireAuthenticatedUser();
    const admin = await isNazoryAdmin(supabase, user);

    const article = admin
      ? await (async () => {
          const existing = await getArticleById(supabase, id);
          if (!existing) {
            throw new Error("Článek nebyl nalezen.");
          }
          return publishArticle(createSupabaseServiceClient(), id, existing.author_id);
        })()
      : await (async () => {
          await requireAuthorWithCompletedProfile(supabase, user);
          return publishArticle(supabase, id, user.id);
        })();

    after(async () => {
      await translateAndStoreOpinionArticle(createSupabaseServiceClient(), article).catch((translationError) => {
        console.error("Opinion auto-translation after publish failed", translationError);
      });
    });

    return Response.json({ article });
  } catch (error) {
    if (error instanceof AuthApiError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Článek se nepodařilo publikovat.";
    return Response.json({ error: message }, { status: 500 });
  }
}
