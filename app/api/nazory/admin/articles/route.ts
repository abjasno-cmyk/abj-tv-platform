import { AuthApiError, requireAuthenticatedUser } from "@/lib/supabase/authenticated-server";
import { requireNazoryAdmin } from "@/lib/nazory/access";
import { listAllArticlesForAdmin, restoreArticle, softDeleteArticle } from "@/lib/nazory/articles";

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
