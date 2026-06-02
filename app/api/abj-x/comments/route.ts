import { enforceWriteRateLimit } from "@/lib/rateLimit";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MAX_BODY_LENGTH = 500;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

type CommentRow = {
  id: string;
  post_id: string;
  author_name: string;
  body: string;
  created_at: string;
};

type CreateCommentPayload = {
  postId?: unknown;
  videoId?: unknown;
  body?: unknown;
  sessionId?: unknown;
  authorName?: unknown;
};

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toPublicComment(row: CommentRow) {
  return {
    id: row.id,
    postId: row.post_id,
    authorName: row.author_name,
    body: row.body,
    createdAt: row.created_at,
  };
}

async function resolveSupabase() {
  try {
    return await createSupabaseServerClient();
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const postId = normalizeText(url.searchParams.get("postId"));
  if (!postId) {
    return Response.json({ error: "Missing postId" }, { status: 400 });
  }

  const limitInput = Number(url.searchParams.get("limit") ?? DEFAULT_LIMIT);
  const limit = Number.isFinite(limitInput)
    ? Math.max(1, Math.min(MAX_LIMIT, Math.floor(limitInput)))
    : DEFAULT_LIMIT;

  const supabase = await resolveSupabase();
  if (!supabase) {
    return Response.json({ error: "Supabase unavailable" }, { status: 503 });
  }

  const { data, error } = await supabase
    .from("abjx_post_comments")
    .select("id, post_id, author_name, body, created_at")
    .eq("post_id", postId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    return Response.json({ error: "Failed to load comments" }, { status: 500 });
  }

  const comments = ((data ?? []) as CommentRow[]).map(toPublicComment);
  return Response.json({ comments });
}

export async function POST(request: Request) {
  const limited = enforceWriteRateLimit(request, "abjx");
  if (limited) return limited;

  let payload: CreateCommentPayload;
  try {
    payload = (await request.json()) as CreateCommentPayload;
  } catch {
    return Response.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const postId = normalizeText(payload.postId);
  const videoId = normalizeText(payload.videoId);
  const body = normalizeText(payload.body);
  const sessionId = normalizeText(payload.sessionId) || "anon";
  const authorName = normalizeText(payload.authorName) || "Divák ABJ";

  if (!postId || !videoId) {
    return Response.json({ error: "postId and videoId are required" }, { status: 400 });
  }
  if (!body) {
    return Response.json({ error: "Comment body is required" }, { status: 400 });
  }
  if (body.length > MAX_BODY_LENGTH) {
    return Response.json({ error: `Comment body too long (${MAX_BODY_LENGTH} max)` }, { status: 400 });
  }

  const supabase = await resolveSupabase();
  if (!supabase) {
    return Response.json({ error: "Supabase unavailable" }, { status: 503 });
  }

  const { data, error } = await supabase
    .from("abjx_post_comments")
    .insert({
      post_id: postId,
      video_id: videoId,
      session_id: sessionId,
      author_name: authorName,
      body,
    })
    .select("id, post_id, author_name, body, created_at")
    .single();

  if (error || !data) {
    return Response.json({ error: "Failed to create comment" }, { status: 500 });
  }

  const { count, error: countError } = await supabase
    .from("abjx_post_comments")
    .select("id", { head: true, count: "exact" })
    .eq("post_id", postId);

  if (countError) {
    return Response.json(
      {
        comment: toPublicComment(data as CommentRow),
        commentCount: 0,
      },
      { status: 201 },
    );
  }

  return Response.json(
    {
      comment: toPublicComment(data as CommentRow),
      commentCount: count ?? 0,
    },
    { status: 201 },
  );
}
