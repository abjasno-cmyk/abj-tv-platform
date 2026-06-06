import { AuthApiError, requireAuthenticatedUser } from "@/lib/supabase/authenticated-server";
import { requireAuthorWithCompletedProfile } from "@/lib/nazory/access";
import { hasMeaningfulDraftContent } from "@/lib/nazory/content";
import { createDraftArticle, listAuthorArticles } from "@/lib/nazory/articles";
import { enforceWriteRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { supabase, user } = await requireAuthenticatedUser();
    await requireAuthorWithCompletedProfile(supabase, user);
    const articles = await listAuthorArticles(supabase, user.id);
    return Response.json({
      articles: articles.map((article) => ({
        id: article.id,
        title: article.title,
        status: article.status,
        slug: article.slug,
        updatedAt: article.updated_at,
        publishedAt: article.published_at,
      })),
    });
  } catch (error) {
    if (error instanceof AuthApiError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Články se nepodařilo načíst." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const limited = enforceWriteRateLimit(request, "nazory-articles");
    if (limited) return limited;

    const { supabase, user } = await requireAuthenticatedUser();
    await requireAuthorWithCompletedProfile(supabase, user);
    const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const title = typeof payload.title === "string" ? payload.title : "";
    const perex = typeof payload.perex === "string" ? payload.perex : "";
    const contentJson =
      payload.contentJson && typeof payload.contentJson === "object"
        ? (payload.contentJson as Record<string, unknown>)
        : undefined;

    if (!hasMeaningfulDraftContent(title, perex, contentJson)) {
      return Response.json({ error: "Koncept bez obsahu nelze vytvořit." }, { status: 400 });
    }

    const article = await createDraftArticle(supabase, user.id, {
      title,
      perex,
      contentJson,
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
