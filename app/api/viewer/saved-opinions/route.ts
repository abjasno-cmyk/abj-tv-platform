import { AuthApiError, requireAuthenticatedUser } from "@/lib/supabase/authenticated-server";
import { VIEWER_ENTITY_OPINION } from "@/lib/viewer/entities";

export const dynamic = "force-dynamic";

type SavedOpinionPayload = {
  articleId?: unknown;
  title?: unknown;
  slug?: unknown;
  heroImagePath?: unknown;
  authorName?: unknown;
};

function normalizeString(value: unknown, max = 500): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function GET() {
  try {
    const { supabase, user } = await requireAuthenticatedUser();
    const rows = await supabase
      .from("saved_opinion_articles")
      .select("article_id, title, slug, hero_image_path, author_name, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (rows.error) {
      return Response.json({ error: "Nepodařilo se načíst uložené články." }, { status: 500 });
    }

    return Response.json({
      articles: (rows.data ?? []).map((row) => ({
        articleId: row.article_id,
        title: row.title,
        slug: row.slug,
        heroImagePath: row.hero_image_path,
        authorName: row.author_name,
        savedAt: row.created_at,
        href: row.slug ? `/nazory/${row.slug}` : "/nazory",
      })),
    });
  } catch (error) {
    if (error instanceof AuthApiError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Nepodařilo se načíst uložené články." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireAuthenticatedUser();
    const payload = (await request.json().catch(() => ({}))) as SavedOpinionPayload;
    const articleId = normalizeString(payload.articleId, 80);
    if (!articleId) {
      return Response.json({ error: "articleId je povinné." }, { status: 400 });
    }

    const title = normalizeString(payload.title, 500) || "Článek Názorů";
    const slug = normalizeString(payload.slug, 200);
    const heroImagePath = normalizeString(payload.heroImagePath, 500) || null;
    const authorName = normalizeString(payload.authorName, 200) || null;

    const insert = await supabase.from("saved_opinion_articles").upsert(
      {
        user_id: user.id,
        article_id: articleId,
        title,
        slug,
        hero_image_path: heroImagePath,
        author_name: authorName,
      },
      { onConflict: "user_id,article_id" },
    );

    if (insert.error) {
      const message =
        insert.error.code === "42P01"
          ? "Chybí tabulka saved_opinion_articles. Spusťte migraci 014_saved_opinion_articles.sql v Supabase."
          : "Uložení článku selhalo.";
      return Response.json({ error: message }, { status: 500 });
    }

    await supabase.from("viewer_activity").insert({
      user_id: user.id,
      event_type: "opinion_saved",
      entity_type: VIEWER_ENTITY_OPINION,
      entity_id: articleId,
      metadata: { title, slug, author_name: authorName },
    });

    return Response.json({ ok: true, saved: true });
  } catch (error) {
    if (error instanceof AuthApiError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Uložení článku selhalo." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { supabase, user } = await requireAuthenticatedUser();
    const url = new URL(request.url);
    const articleId = normalizeString(url.searchParams.get("articleId"), 80);
    if (!articleId) {
      return Response.json({ error: "articleId je povinné." }, { status: 400 });
    }

    const remove = await supabase
      .from("saved_opinion_articles")
      .delete()
      .eq("user_id", user.id)
      .eq("article_id", articleId);
    if (remove.error) {
      return Response.json({ error: "Odebrání článku selhalo." }, { status: 500 });
    }

    await supabase.from("viewer_activity").insert({
      user_id: user.id,
      event_type: "opinion_unsaved",
      entity_type: VIEWER_ENTITY_OPINION,
      entity_id: articleId,
      metadata: {},
    });

    return Response.json({ ok: true, saved: false });
  } catch (error) {
    if (error instanceof AuthApiError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Odebrání článku selhalo." }, { status: 500 });
  }
}
