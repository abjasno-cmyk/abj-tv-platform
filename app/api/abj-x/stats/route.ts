import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MAX_POST_IDS = 100;

type StatsItem = {
  reactionCount: number;
  commentCount: number;
  shareCount: number;
  reactedByMe: boolean;
};

function normalizeText(value: string | null): string {
  return typeof value === "string" ? value.trim() : "";
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
  const postIdsRaw = normalizeText(url.searchParams.get("postIds"));
  const sessionId = normalizeText(url.searchParams.get("sessionId"));
  const postIds = Array.from(
    new Set(
      postIdsRaw
        .split(",")
        .map((id) => id.trim())
        .filter((id) => id.length > 0),
    ),
  ).slice(0, MAX_POST_IDS);

  if (postIds.length === 0) {
    return Response.json({ stats: {} });
  }

  const supabase = await resolveSupabase();
  if (!supabase) {
    return Response.json({ error: "Supabase unavailable" }, { status: 503 });
  }

  const [reactionsRes, commentsRes, sharesRes] = await Promise.all([
    supabase.from("abjx_post_reactions").select("post_id, session_id").in("post_id", postIds),
    supabase.from("abjx_post_comments").select("post_id").in("post_id", postIds),
    supabase.from("abjx_post_shares").select("post_id").in("post_id", postIds),
  ]);

  if (reactionsRes.error || commentsRes.error || sharesRes.error) {
    return Response.json(
      {
        error: "Failed to load social stats",
        details: reactionsRes.error?.message ?? commentsRes.error?.message ?? sharesRes.error?.message,
      },
      { status: 500 },
    );
  }

  const stats = postIds.reduce<Record<string, StatsItem>>((acc, postId) => {
    acc[postId] = {
      reactionCount: 0,
      commentCount: 0,
      shareCount: 0,
      reactedByMe: false,
    };
    return acc;
  }, {});

  for (const row of reactionsRes.data ?? []) {
    const postId = typeof row.post_id === "string" ? row.post_id : "";
    if (!postId || !stats[postId]) continue;
    stats[postId].reactionCount += 1;
    if (sessionId && row.session_id === sessionId) {
      stats[postId].reactedByMe = true;
    }
  }
  for (const row of commentsRes.data ?? []) {
    const postId = typeof row.post_id === "string" ? row.post_id : "";
    if (!postId || !stats[postId]) continue;
    stats[postId].commentCount += 1;
  }
  for (const row of sharesRes.data ?? []) {
    const postId = typeof row.post_id === "string" ? row.post_id : "";
    if (!postId || !stats[postId]) continue;
    stats[postId].shareCount += 1;
  }

  return Response.json({ stats });
}
