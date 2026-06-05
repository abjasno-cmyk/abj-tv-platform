import "server-only";

import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

export const COMMENT_CORE_SELECT =
  "id, user_id, entity_type, entity_id, parent_id, body, status, created_at, updated_at";

export const COMMENT_FULL_SELECT = `${COMMENT_CORE_SELECT}, is_pinned`;

export type CommentDbRow = {
  id: string;
  user_id: string;
  entity_type: string;
  entity_id: string;
  parent_id: string | null;
  body: string;
  status: string;
  created_at: string;
  updated_at: string;
  is_pinned?: boolean | null;
};

export function isSupabaseSchemaMismatch(error: { message?: string } | null | undefined): boolean {
  const message = error?.message ?? "";
  return /relation .* does not exist|column .* does not exist/i.test(message);
}

export function normalizeCommentRow(row: CommentDbRow): CommentDbRow & { is_pinned: boolean } {
  return {
    ...row,
    is_pinned: Boolean(row.is_pinned),
  };
}

type ListCommentsParams = {
  entityType: string;
  entityId?: string;
  limit: number;
};

export async function listPublishedComments(
  supabase: SupabaseClient,
  params: ListCommentsParams,
): Promise<{ rows: Array<CommentDbRow & { is_pinned: boolean }>; supportsPinned: boolean; schemaReady: boolean }> {
  const runQuery = async (select: string, orderPinned: boolean) => {
    let query = supabase.from("comments").select(select).eq("entity_type", params.entityType).limit(params.limit);

    if (orderPinned) {
      query = query.order("is_pinned", { ascending: false }).order("created_at", { ascending: true });
    } else {
      query = query.order("created_at", { ascending: true });
    }

    if (params.entityId) {
      query = query.eq("entity_id", params.entityId);
    }

    return query;
  };

  let supportsPinned = true;
  let result = await runQuery(COMMENT_FULL_SELECT, true);
  if (isSupabaseSchemaMismatch(result.error)) {
    supportsPinned = false;
    result = await runQuery(COMMENT_CORE_SELECT, false);
  }

  if (result.error) {
    if (isSupabaseSchemaMismatch(result.error)) {
      return { rows: [], supportsPinned: false, schemaReady: false };
    }
    throw result.error;
  }

  const rows = (result.data ?? []) as unknown as CommentDbRow[];
  return {
    rows: rows.map((row) => normalizeCommentRow(row)),
    supportsPinned,
    schemaReady: true,
  };
}

export async function insertComment(
  supabase: SupabaseClient,
  payload: {
    user_id: string;
    entity_type: string;
    entity_id: string;
    parent_id: string | null;
    body: string;
  },
): Promise<{ row: CommentDbRow & { is_pinned: boolean }; supportsPinned: boolean }> {
  const insertPayload = { ...payload };

  let insert = await supabase
    .from("comments")
    .insert(insertPayload)
    .select(COMMENT_FULL_SELECT)
    .single();

  if (isSupabaseSchemaMismatch(insert.error)) {
    insert = await supabase.from("comments").insert(insertPayload).select(COMMENT_CORE_SELECT).single();
  }

  if (insert.error || !insert.data) {
    throw insert.error ?? new Error("comment_insert_failed");
  }

  const row = insert.data as unknown as CommentDbRow;
  return {
    row: normalizeCommentRow(row),
    supportsPinned: "is_pinned" in row,
  };
}
