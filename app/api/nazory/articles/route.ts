import { AuthApiError, requireAuthenticatedUser } from "@/lib/supabase/authenticated-server";
import { requireAuthorWithCompletedProfile } from "@/lib/nazory/access";
import { createDraftArticle } from "@/lib/nazory/articles";
import { enforceWriteRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const limited = enforceWriteRateLimit(request, "nazory-articles");
    if (limited) return limited;

    const { supabase, user } = await requireAuthenticatedUser();
    await requireAuthorWithCompletedProfile(supabase, user);
    const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const article = await createDraftArticle(supabase, user.id, {
      title: typeof payload.title === "string" ? payload.title : "",
      perex: typeof payload.perex === "string" ? payload.perex : "",
      contentJson:
        payload.contentJson && typeof payload.contentJson === "object"
          ? (payload.contentJson as Record<string, unknown>)
          : undefined,
    });
    return Response.json({ article });
  } catch (error) {
    if (error instanceof AuthApiError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Koncept se nepodařilo vytvořit.";
    return Response.json({ error: message }, { status: 500 });
  }
}
