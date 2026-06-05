import { AuthApiError, requireAuthenticatedUser } from "@/lib/supabase/authenticated-server";
import { canModerateViewerComments } from "@/lib/viewer/commentAccess";
import { mapCommentRows } from "@/lib/viewer/commentMapper";
import {
  COMMENT_CORE_SELECT,
  COMMENT_FULL_SELECT,
  isSupabaseSchemaMismatch,
  normalizeCommentRow,
  type CommentDbRow,
} from "@/lib/viewer/commentsDb";

export const dynamic = "force-dynamic";

type ModeratePayload = {
  commentId?: unknown;
  action?: unknown;
};

function normalize(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

const ALLOWED_ACTIONS = new Set(["hide", "pin", "unpin"]);

async function loadCommentRow(supabase: Awaited<ReturnType<typeof requireAuthenticatedUser>>["supabase"], commentId: string) {
  let current = await supabase.from("comments").select(COMMENT_FULL_SELECT).eq("id", commentId).maybeSingle();
  if (isSupabaseSchemaMismatch(current.error)) {
    current = await supabase.from("comments").select(COMMENT_CORE_SELECT).eq("id", commentId).maybeSingle();
  }
  return current;
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireAuthenticatedUser();
    const canModerate = await canModerateViewerComments(supabase, user);
    if (!canModerate) {
      return Response.json({ error: "Nemáte oprávnění moderovat komentáře." }, { status: 403 });
    }

    const payload = (await request.json().catch(() => ({}))) as ModeratePayload;
    const commentId = normalize(payload.commentId);
    const action = normalize(payload.action);

    if (!commentId) {
      return Response.json({ error: "commentId je povinné." }, { status: 400 });
    }
    if (!ALLOWED_ACTIONS.has(action)) {
      return Response.json({ error: "Neplatná akce moderace." }, { status: 400 });
    }

    const current = await loadCommentRow(supabase, commentId);
    if (current.error || !current.data) {
      return Response.json({ error: "Komentář nebyl nalezen." }, { status: 404 });
    }

    if (action === "hide") {
      const update = await supabase.from("comments").update({ status: "hidden" }).eq("id", commentId).select("id").single();
      if (update.error) {
        return Response.json({ error: "Komentář se nepodařilo skrýt." }, { status: 500 });
      }
      await supabase.from("viewer_activity").insert({
        user_id: user.id,
        event_type: "comment_moderated",
        entity_type: current.data.entity_type,
        entity_id: current.data.entity_id,
        metadata: { comment_id: commentId, action: "hide" },
      });
      return Response.json({ ok: true, removed: true });
    }

    const isPinned = action === "pin";
    let update = await supabase
      .from("comments")
      .update({ is_pinned: isPinned })
      .eq("id", commentId)
      .select(COMMENT_FULL_SELECT)
      .single();

    if (isSupabaseSchemaMismatch(update.error)) {
      return Response.json(
        {
          error:
            "Připínání komentářů vyžaduje migraci databáze (supabase/008_comments_pinned.sql). Skrývání komentářů funguje i bez ní.",
        },
        { status: 503 },
      );
    }

    if (update.error || !update.data) {
      return Response.json({ error: "Komentář se nepodařilo upravit." }, { status: 500 });
    }

    const [comment] = await mapCommentRows(
      supabase,
      [normalizeCommentRow(update.data as CommentDbRow)],
      { viewerCanModerate: true },
    );
    return Response.json({ ok: true, comment });
  } catch (error) {
    if (error instanceof AuthApiError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Moderace se nezdařila." }, { status: 500 });
  }
}
