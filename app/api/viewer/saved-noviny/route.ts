import { AuthApiError, requireAuthenticatedUser } from "@/lib/supabase/authenticated-server";
import { VIEWER_ENTITY_NOVINY_ARTICLE } from "@/lib/viewer/entities";

export const dynamic = "force-dynamic";

type SavedNovinyPayload = {
  articleId?: unknown;
  title?: unknown;
  sourceName?: unknown;
  originalUrl?: unknown;
  imageUrl?: unknown;
  publishedAt?: unknown;
};

function normalizeString(value: unknown, max = 500): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function normalizeDate(value: unknown): string | null {
  const raw = normalizeString(value, 80);
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export async function GET() {
  try {
    const { supabase, user } = await requireAuthenticatedUser();
    const rows = await supabase
      .from("saved_noviny_articles")
      .select("article_id, title, source_name, original_url, image_url, published_at, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (rows.error) {
      return Response.json({ error: "Nepodařilo se načíst uložené články Novin." }, { status: 500 });
    }

    return Response.json({
      articles: (rows.data ?? []).map((row) => ({
        articleId: row.article_id,
        title: row.title,
        sourceName: row.source_name,
        originalUrl: row.original_url,
        imageUrl: row.image_url,
        publishedAt: row.published_at,
        savedAt: row.created_at,
        href: `/noviny#noviny-article-${row.article_id}`,
      })),
    });
  } catch (error) {
    if (error instanceof AuthApiError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Nepodařilo se načíst uložené články Novin." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireAuthenticatedUser();
    const payload = (await request.json().catch(() => ({}))) as SavedNovinyPayload;
    const articleId = normalizeString(payload.articleId, 80);
    if (!articleId) {
      return Response.json({ error: "articleId je povinné." }, { status: 400 });
    }

    const title = normalizeString(payload.title, 500) || "Článek Novin";
    const sourceName = normalizeString(payload.sourceName, 200) || null;
    const originalUrl = normalizeString(payload.originalUrl, 1000);
    const imageUrl = normalizeString(payload.imageUrl, 1000) || null;
    const publishedAt = normalizeDate(payload.publishedAt);

    const insert = await supabase.from("saved_noviny_articles").upsert(
      {
        user_id: user.id,
        article_id: articleId,
        title,
        source_name: sourceName,
        original_url: originalUrl,
        image_url: imageUrl,
        published_at: publishedAt,
      },
      { onConflict: "user_id,article_id" },
    );

    if (insert.error) {
      const message =
        insert.error.code === "42P01"
          ? "Chybí tabulka saved_noviny_articles. Spusťte migraci 021_saved_noviny_articles.sql v Supabase."
          : "Uložení článku Novin selhalo.";
      return Response.json({ error: message }, { status: 500 });
    }

    await supabase.from("viewer_activity").insert({
      user_id: user.id,
      event_type: "noviny_article_saved",
      entity_type: VIEWER_ENTITY_NOVINY_ARTICLE,
      entity_id: articleId,
      metadata: { title, source_name: sourceName, original_url: originalUrl },
    });

    return Response.json({ ok: true, saved: true });
  } catch (error) {
    if (error instanceof AuthApiError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Uložení článku Novin selhalo." }, { status: 500 });
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
      .from("saved_noviny_articles")
      .delete()
      .eq("user_id", user.id)
      .eq("article_id", articleId);
    if (remove.error) {
      return Response.json({ error: "Odebrání článku Novin selhalo." }, { status: 500 });
    }

    await supabase.from("viewer_activity").insert({
      user_id: user.id,
      event_type: "noviny_article_unsaved",
      entity_type: VIEWER_ENTITY_NOVINY_ARTICLE,
      entity_id: articleId,
      metadata: {},
    });

    return Response.json({ ok: true, saved: false });
  } catch (error) {
    if (error instanceof AuthApiError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Odebrání článku Novin selhalo." }, { status: 500 });
  }
}
