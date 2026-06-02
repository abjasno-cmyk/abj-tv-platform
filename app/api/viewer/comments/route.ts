import { AuthApiError, requireAuthenticatedUser } from "@/lib/supabase/authenticated-server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 40;
const MAX_LIMIT = 100;

type CreateCommentPayload = {
  entityType?: unknown;
  entityId?: unknown;
  parentId?: unknown;
  body?: unknown;
};

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const entityType = normalizeString(url.searchParams.get("entityType"));
  const entityId = normalizeString(url.searchParams.get("entityId"));
  if (!entityType || !entityId) {
    return Response.json({ error: "entityType a entityId jsou povinné." }, { status: 400 });
  }

  const parsedLimit = Number(url.searchParams.get("limit") ?? DEFAULT_LIMIT);
  const limit = Number.isFinite(parsedLimit)
    ? Math.max(1, Math.min(MAX_LIMIT, Math.floor(parsedLimit)))
    : DEFAULT_LIMIT;

  const supabase = await createSupabaseServerClient();
  const query = await supabase
    .from("comments")
    .select("id, user_id, entity_type, entity_id, parent_id, body, status, created_at, updated_at")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (query.error) {
    return Response.json({ error: "Načtení komentářů selhalo." }, { status: 500 });
  }

  const rows = query.data ?? [];
  const userIds = Array.from(new Set(rows.map((row) => row.user_id).filter((value) => typeof value === "string")));
  const profilesLookup = userIds.length
    ? await supabase.from("profiles").select("id, display_name, avatar_url").in("id", userIds)
    : { data: [] as Array<{ id: string; display_name: string | null; avatar_url: string | null }>, error: null };

  const profileById = new Map<string, { display_name: string | null; avatar_url: string | null }>();
  if (!profilesLookup.error) {
    for (const profile of profilesLookup.data ?? []) {
      profileById.set(profile.id, {
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
      });
    }
  }

  const comments = rows.map((row) => {
    const profile = profileById.get(row.user_id);
    return {
      id: row.id,
      userId: row.user_id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      parentId: row.parent_id,
      body: row.body,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      authorName: profile?.display_name ?? "Divák VEROX",
      authorAvatarUrl: profile?.avatar_url ?? null,
    };
  });

  return Response.json({ comments });
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireAuthenticatedUser();
    const payload = (await request.json().catch(() => ({}))) as CreateCommentPayload;
    const entityType = normalizeString(payload.entityType).slice(0, 100);
    const entityId = normalizeString(payload.entityId).slice(0, 160);
    const parentId = normalizeString(payload.parentId) || null;
    const body = normalizeString(payload.body);

    if (!entityType || !entityId) {
      return Response.json({ error: "entityType a entityId jsou povinné." }, { status: 400 });
    }
    if (body.length < 2) {
      return Response.json({ error: "Komentář je příliš krátký." }, { status: 400 });
    }
    if (body.length > 2000) {
      return Response.json({ error: "Komentář je příliš dlouhý (max. 2000 znaků)." }, { status: 400 });
    }

    const insert = await supabase
      .from("comments")
      .insert({
        user_id: user.id,
        entity_type: entityType,
        entity_id: entityId,
        parent_id: parentId,
        body,
      })
      .select("id, user_id, entity_type, entity_id, parent_id, body, status, created_at, updated_at")
      .single();

    if (insert.error || !insert.data) {
      return Response.json({ error: "Vytvoření komentáře selhalo." }, { status: 500 });
    }

    await supabase.from("viewer_activity").insert({
      user_id: user.id,
      event_type: "comment_created",
      entity_type: entityType,
      entity_id: entityId,
      metadata: {
        comment_id: insert.data.id,
        parent_id: parentId,
      },
    });

    return Response.json(
      {
        ok: true,
        comment: {
          id: insert.data.id,
          userId: insert.data.user_id,
          entityType: insert.data.entity_type,
          entityId: insert.data.entity_id,
          parentId: insert.data.parent_id,
          body: insert.data.body,
          status: insert.data.status,
          createdAt: insert.data.created_at,
          updatedAt: insert.data.updated_at,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof AuthApiError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Komentář se nepodařilo uložit." }, { status: 500 });
  }
}
