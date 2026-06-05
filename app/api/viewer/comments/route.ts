import { AuthApiError, requireAuthenticatedUser } from "@/lib/supabase/authenticated-server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { canModerateViewerComments } from "@/lib/viewer/commentAccess";
import { mapCommentRows } from "@/lib/viewer/commentMapper";
import { VIEWER_COMMENT_ENTITY_VIDEO } from "@/lib/viewer/comments";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 80;
const MAX_LIMIT = 300;
const GLOBAL_LIMIT = 500;

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
  const scope = normalizeString(url.searchParams.get("scope"));

  if (!entityType) {
    return Response.json({ error: "entityType je povinné." }, { status: 400 });
  }

  const isGlobalVideoFeed =
    scope === "global" && entityType === VIEWER_COMMENT_ENTITY_VIDEO && !entityId;

  if (!isGlobalVideoFeed && !entityId) {
    return Response.json({ error: "entityId je povinné." }, { status: 400 });
  }

  const parsedLimit = Number(url.searchParams.get("limit") ?? (isGlobalVideoFeed ? GLOBAL_LIMIT : DEFAULT_LIMIT));
  const limit = Number.isFinite(parsedLimit)
    ? Math.max(1, Math.min(isGlobalVideoFeed ? GLOBAL_LIMIT : MAX_LIMIT, Math.floor(parsedLimit)))
    : isGlobalVideoFeed
      ? GLOBAL_LIMIT
      : DEFAULT_LIMIT;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const viewerCanModerate = user ? await canModerateViewerComments(supabase, user) : false;

  let query = supabase
    .from("comments")
    .select("id, user_id, entity_type, entity_id, parent_id, body, status, is_pinned, created_at, updated_at")
    .eq("entity_type", entityType)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(limit);

  if (!isGlobalVideoFeed) {
    query = query.eq("entity_id", entityId);
  }

  const result = await query;
  if (result.error) {
    return Response.json({ error: "Načtení komentářů selhalo." }, { status: 500 });
  }

  const comments = await mapCommentRows(supabase, result.data ?? [], { viewerCanModerate });

  return Response.json({
    comments,
    scope: isGlobalVideoFeed ? "global" : "entity",
    canModerate: viewerCanModerate,
  });
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

    if (parentId) {
      const parent = await supabase
        .from("comments")
        .select("id, entity_type, entity_id, status")
        .eq("id", parentId)
        .maybeSingle();
      if (parent.error || !parent.data) {
        return Response.json({ error: "Odpovídaný komentář nebyl nalezen." }, { status: 404 });
      }
      if (parent.data.status !== "published") {
        return Response.json({ error: "Na tento komentář nelze odpovědět." }, { status: 400 });
      }
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
      .select("id, user_id, entity_type, entity_id, parent_id, body, status, is_pinned, created_at, updated_at")
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

    const viewerCanModerate = await canModerateViewerComments(supabase, user);
    const [comment] = await mapCommentRows(supabase, [insert.data], { viewerCanModerate });

    return Response.json({ ok: true, comment }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthApiError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Komentář se nepodařilo uložit." }, { status: 500 });
  }
}
