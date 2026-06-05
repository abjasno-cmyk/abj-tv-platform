import { AuthApiError, requireAuthenticatedUser } from "@/lib/supabase/authenticated-server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { canModerateViewerComments } from "@/lib/viewer/commentAccess";
import { mapCommentRows } from "@/lib/viewer/commentMapper";
import { VIEWER_COMMENT_ENTITY_VIDEO } from "@/lib/viewer/comments";
import { insertComment, isSupabaseSchemaMismatch, listPublishedComments } from "@/lib/viewer/commentsDb";

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

function publicErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const message = String((error as { message: string }).message);
    if (isSupabaseSchemaMismatch(error as { message: string })) {
      return "Tabulka komentářů na serveru ještě není připravená. Spusťte migraci supabase/004_viewer_accounts.sql a 008_comments_pinned.sql.";
    }
    if (message.toLowerCase().includes("row-level security")) {
      return "Komentář se nepodařilo uložit — zkuste se znovu přihlásit.";
    }
  }
  return fallback;
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

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const viewerCanModerate = user ? await canModerateViewerComments(supabase, user) : false;

    const { rows, supportsPinned, schemaReady } = await listPublishedComments(supabase, {
      entityType,
      entityId: isGlobalVideoFeed ? undefined : entityId,
      limit,
    });

    const comments = await mapCommentRows(supabase, rows, { viewerCanModerate });

    return Response.json({
      comments,
      scope: isGlobalVideoFeed ? "global" : "entity",
      canModerate: viewerCanModerate,
      schemaReady,
      supportsPinned,
    });
  } catch (error) {
    return Response.json(
      { error: publicErrorMessage(error, "Načtení komentářů selhalo.") },
      { status: 500 },
    );
  }
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

    let viewerCanModerate = false;
    try {
      viewerCanModerate = await canModerateViewerComments(supabase, user);
    } catch {
      viewerCanModerate = false;
    }

    const { row } = await insertComment(supabase, {
      user_id: user.id,
      entity_type: entityType,
      entity_id: entityId,
      parent_id: parentId,
      body,
    });

    await supabase.from("viewer_activity").insert({
      user_id: user.id,
      event_type: "comment_created",
      entity_type: entityType,
      entity_id: entityId,
      metadata: {
        comment_id: row.id,
        parent_id: parentId,
      },
    });

    const [comment] = await mapCommentRows(supabase, [row], { viewerCanModerate });

    return Response.json({ ok: true, comment }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthApiError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json(
      { error: publicErrorMessage(error, "Komentář se nepodařilo uložit.") },
      { status: 500 },
    );
  }
}
