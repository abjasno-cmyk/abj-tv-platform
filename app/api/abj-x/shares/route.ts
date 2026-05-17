import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type SharePayload = {
  postId?: unknown;
  videoId?: unknown;
  sessionId?: unknown;
};

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

async function resolveSupabase() {
  try {
    return await createSupabaseServerClient();
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  let payload: SharePayload;
  try {
    payload = (await request.json()) as SharePayload;
  } catch {
    return Response.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const postId = normalizeText(payload.postId);
  const videoId = normalizeText(payload.videoId);
  const sessionId = normalizeText(payload.sessionId) || "anon";
  if (!postId || !videoId) {
    return Response.json({ error: "postId and videoId are required" }, { status: 400 });
  }

  const supabase = await resolveSupabase();
  if (!supabase) {
    return Response.json({ error: "Supabase unavailable" }, { status: 503 });
  }

  const { error: insertError } = await supabase.from("abjx_post_shares").insert({
    post_id: postId,
    video_id: videoId,
    session_id: sessionId,
  });
  if (insertError) {
    return Response.json({ error: "Failed to persist share", details: insertError.message }, { status: 500 });
  }

  const { count, error: countError } = await supabase
    .from("abjx_post_shares")
    .select("id", { head: true, count: "exact" })
    .eq("post_id", postId);
  if (countError) {
    return Response.json({ error: "Failed to load share count", details: countError.message }, { status: 500 });
  }

  return Response.json({ shareCount: count ?? 0 });
}
