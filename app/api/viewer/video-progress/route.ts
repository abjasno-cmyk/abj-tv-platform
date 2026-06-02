import { AuthApiError, requireAuthenticatedUser } from "@/lib/supabase/authenticated-server";

export const dynamic = "force-dynamic";

type VideoProgressPayload = {
  videoId?: unknown;
  positionSeconds?: unknown;
  durationSeconds?: unknown;
  progressPercent?: unknown;
  completed?: unknown;
};

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeInteger(value: unknown): number | null {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.max(0, Math.floor(numeric));
}

function normalizePercent(value: unknown): number | null {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.max(0, Math.min(100, Math.round(numeric * 100) / 100));
}

export async function GET(request: Request) {
  try {
    const { supabase, user } = await requireAuthenticatedUser();
    const url = new URL(request.url);
    const videoId = normalizeString(url.searchParams.get("videoId"));
    if (!videoId) {
      return Response.json({ error: "videoId je povinné." }, { status: 400 });
    }

    const row = await supabase
      .from("video_progress")
      .select("user_id, video_id, position_seconds, duration_seconds, progress_percent, completed, last_watched_at")
      .eq("user_id", user.id)
      .eq("video_id", videoId)
      .maybeSingle();

    if (row.error) {
      return Response.json({ error: "Nepodařilo se načíst progres videa." }, { status: 500 });
    }

    return Response.json({ progress: row.data ?? null });
  } catch (error) {
    if (error instanceof AuthApiError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Nepodařilo se načíst progres videa." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireAuthenticatedUser();
    const payload = (await request.json().catch(() => ({}))) as VideoProgressPayload;
    const videoId = normalizeString(payload.videoId).slice(0, 160);
    if (!videoId) {
      return Response.json({ error: "videoId je povinné." }, { status: 400 });
    }

    const positionSeconds = normalizeInteger(payload.positionSeconds) ?? 0;
    const durationSeconds = normalizeInteger(payload.durationSeconds);
    const calculatedPercent =
      durationSeconds && durationSeconds > 0 ? Math.min(100, (positionSeconds / durationSeconds) * 100) : null;
    const progressPercent = normalizePercent(payload.progressPercent) ?? normalizePercent(calculatedPercent) ?? 0;
    const completed = payload.completed === true || progressPercent >= 90;

    const upsert = await supabase
      .from("video_progress")
      .upsert(
        {
          user_id: user.id,
          video_id: videoId,
          position_seconds: positionSeconds,
          duration_seconds: durationSeconds,
          progress_percent: progressPercent,
          completed,
          last_watched_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,video_id",
        }
      )
      .select("user_id, video_id, position_seconds, duration_seconds, progress_percent, completed, last_watched_at")
      .single();

    if (upsert.error || !upsert.data) {
      return Response.json({ error: "Uložení progresu selhalo." }, { status: 500 });
    }

    await supabase.from("viewer_activity").insert({
      user_id: user.id,
      event_type: completed ? "video_completed" : "video_progress",
      entity_type: "video",
      entity_id: videoId,
      metadata: {
        position_seconds: positionSeconds,
        duration_seconds: durationSeconds,
        progress_percent: progressPercent,
      },
    });

    return Response.json({ ok: true, progress: upsert.data });
  } catch (error) {
    if (error instanceof AuthApiError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Uložení progresu selhalo." }, { status: 500 });
  }
}
