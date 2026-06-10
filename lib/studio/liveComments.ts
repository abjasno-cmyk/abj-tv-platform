import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getNowPlaying } from "@/lib/programEngine";
import type { LiveCommentBoardItem, LiveCommentsVideoContext } from "@/lib/studio/liveCommentsTypes";
import { mapCommentRows } from "@/lib/viewer/commentMapper";
import { isLikelyCommentQuestion } from "@/lib/viewer/commentQuestion";
import { VIEWER_COMMENT_ENTITY_VIDEO } from "@/lib/viewer/comments";
import {
  COMMENT_CORE_SELECT,
  COMMENT_FULL_SELECT,
  isSupabaseSchemaMismatch,
  normalizeCommentRow,
  type CommentDbRow,
} from "@/lib/viewer/commentsDb";

export type { LiveCommentBoardItem, LiveCommentsVideoContext } from "@/lib/studio/liveCommentsTypes";

const DEFAULT_LIMIT = 500;

function normalizeVideoId(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function resolveLiveCommentsVideoContext(
  requestedVideoId: string | null | undefined,
): Promise<LiveCommentsVideoContext | null> {
  const explicitVideoId = normalizeVideoId(requestedVideoId);
  if (explicitVideoId) {
    return {
      videoId: explicitVideoId,
      title: null,
      channel: null,
      type: null,
      isABJ: false,
      source: "query",
    };
  }

  const nowPlaying = await getNowPlaying();
  const videoId = normalizeVideoId(nowPlaying?.videoId ?? null);
  if (!videoId) return null;

  return {
    videoId,
    title: nowPlaying?.title ?? null,
    channel: nowPlaying?.channel ?? null,
    type: nowPlaying?.type ?? null,
    isABJ: Boolean(nowPlaying?.isABJ),
    source: "now_playing",
  };
}

async function listRootVideoComments(
  supabase: SupabaseClient,
  videoId: string,
  limit: number,
): Promise<Array<CommentDbRow & { is_pinned: boolean }>> {
  const runQuery = async (select: string) =>
    supabase
      .from("comments")
      .select(select)
      .eq("entity_type", VIEWER_COMMENT_ENTITY_VIDEO)
      .eq("entity_id", videoId)
      .is("parent_id", null)
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(limit);

  let result = await runQuery(COMMENT_FULL_SELECT);
  if (isSupabaseSchemaMismatch(result.error)) {
    result = await runQuery(COMMENT_CORE_SELECT);
  }

  if (result.error) {
    if (isSupabaseSchemaMismatch(result.error)) return [];
    throw result.error;
  }

  return ((result.data ?? []) as unknown as CommentDbRow[]).map((row) => normalizeCommentRow(row));
}

export async function loadLiveCommentBoard(params: {
  supabase: SupabaseClient;
  videoId: string;
  viewerCanModerate: boolean;
  limit?: number;
}): Promise<LiveCommentBoardItem[]> {
  const rows = await listRootVideoComments(params.supabase, params.videoId, params.limit ?? DEFAULT_LIMIT);
  const mapped = await mapCommentRows(params.supabase, rows, { viewerCanModerate: params.viewerCanModerate });

  return mapped.map((comment) => ({
    ...comment,
    isQuestion: isLikelyCommentQuestion(comment.body),
  }));
}

export function splitLiveCommentsByQuestion(comments: LiveCommentBoardItem[]): {
  questions: LiveCommentBoardItem[];
  other: LiveCommentBoardItem[];
} {
  const questions: LiveCommentBoardItem[] = [];
  const other: LiveCommentBoardItem[] = [];

  for (const comment of comments) {
    if (comment.isQuestion) {
      questions.push(comment);
    } else {
      other.push(comment);
    }
  }

  return { questions, other };
}
