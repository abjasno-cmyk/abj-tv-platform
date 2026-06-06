import { AuthApiError, requireAuthenticatedUser } from "@/lib/supabase/authenticated-server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { requireNazoryAdmin } from "@/lib/nazory/access";
import { getAuthorProfileByUserId } from "@/lib/nazory/authors";
import { createDraftArticle, listAllArticlesForAdmin, restoreArticle, softDeleteArticle } from "@/lib/nazory/articles";
import { enforceWriteRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { supabase, user } = await requireAuthenticatedUser();
    await requireNazoryAdmin(supabase, user);
    const articles = await listAllArticlesForAdmin(supabase);
    return Response.json({ articles });
  } catch (error) {
    if (error instanceof AuthApiError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Články se nepodařilo načíst." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const limited = enforceWriteRateLimit(request, "nazory-admin");
    if (limited) return limited;

    const { supabase, user } = await requireAuthenticatedUser();
    await requireNazoryAdmin(supabase, user);
    const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const authorId = typeof payload.authorId === "string" ? payload.authorId : "";
    if (!authorId) {
      return Response.json({ error: "authorId je povinné." }, { status: 400 });
    }

    const author = await getAuthorProfileByUserId(supabase, authorId);
    if (!author) {
      return Response.json({ error: "Autor nebyl nalezen." }, { status: 404 });
    }

    const elevated = createSupabaseServiceClient();
    const article = await createDraftArticle(elevated, authorId, {
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

export async function PATCH(request: Request) {
  try {
    const { supabase, user } = await requireAuthenticatedUser();
    await requireNazoryAdmin(supabase, user);
    const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const articleId = typeof payload.articleId === "string" ? payload.articleId : "";
    const action = typeof payload.action === "string" ? payload.action : "";
    if (!articleId) {
      return Response.json({ error: "articleId je povinné." }, { status: 400 });
    }

    if (action === "hide") {
      const article = await softDeleteArticle(supabase, articleId);
      return Response.json({ article });
    }
    if (action === "restore") {
      const article = await restoreArticle(supabase, articleId);
      return Response.json({ article });
    }

    return Response.json({ error: "Neznámá akce." }, { status: 400 });
  } catch (error) {
    if (error instanceof AuthApiError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Akci se nepodařilo provést.";
    return Response.json({ error: message }, { status: 500 });
  }
}
