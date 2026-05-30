import { enforceWriteRateLimit } from "@/lib/rateLimit";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ReactionPayload = {
  postId?: unknown;
  videoId?: unknown;
  sessionId?: unknown;
};

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isUniqueViolation(errorCode?: string): boolean {
  return errorCode === "23505";
}

async function resolveSupabase() {
  try {
    return await createSupabaseServerClient();
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const limited = enforceWriteRateLimit(request, "abjx");
  if (limited) return limited;

  let payload: ReactionPayload;
  try {
    payload = (await request.json()) as ReactionPayload;
  } catch {
    return Response.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const postId = normalizeText(payload.postId);
  const videoId = normalizeText(payload.videoId);
  const sessionId = normalizeText(payload.sessionId);
  if (!postId || !videoId || !sessionId) {
    return Response.json({ error: "postId, videoId and sessionId are required" }, { status: 400 });
  }

  const supabase = await resolveSupabase();
  if (!supabase) {
    return Response.json({ error: "Supabase unavailable" }, { status: 503 });
  }

  let reactedNow = false;
  const { error: insertError } = await supabase.from("abjx_post_reactions").insert({
    post_id: postId,
    video_id: videoId,
    session_id: sessionId,
  });
  if (!insertError) {
    reactedNow = true;
  } else if (!isUniqueViolation(insertError.code)) {
    return Response.json({ error: "Failed to persist reaction", details: insertError.message }, { status: 500 });
  }

  const { count, error: countError } = await supabase
    .from("abjx_post_reactions")
    .select("id", { head: true, count: "exact" })
    .eq("post_id", postId);
  if (countError) {
    return Response.json({ error: "Failed to load reaction count", details: countError.message }, { status: 500 });
  }

  return Response.json({
    reactedNow,
    reactionCount: count ?? 0,
  });
}
