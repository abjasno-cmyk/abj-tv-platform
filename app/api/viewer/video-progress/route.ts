import { AuthApiError, requireAuthenticatedUser } from "@/lib/supabase/authenticated-server";

export const dynamic = "force-dynamic";

type VideoProgressPayload = {
  videoId?: unknown;
  positionSeconds?: unknown;
  durationSeconds?: unknown;
  progressPercent?: unknown;
  completed?: unknown;
  title?: unknown;
  thumbnailUrl?: unknown;
  channelName?: unknown;
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

const PROGRESS_COLUMNS =
  "user_id, video_id, position_seconds, duration_seconds, progress_percent, completed, last_watched_at, title, thumbnail_url, channel_name";

export async function GET(request: Request) {
  try {
    const { supabase, user } = await requireAuthenticatedUser();
    const url = new URL(request.url);
    const videoId = normalizeString(url.searchParams.get("videoId"));
    const listAll = url.searchParams.get("list") === "all";

    if (listAll) {
      const rows = await supabase
        .from("video_progress")
        .select(PROGRESS_COLUMNS)
        .eq("user_id", user.id)
        .order("last_watched_at", { ascending: false });

      if (rows.error) {
        return Response.json({ error: "Nepodařilo se načíst historii sledování." }, { status: 500 });
      }

      return Response.json({ progress: rows.data ?? [] });
    }

    if (!videoId) {
      return Response.json({ error: "videoId je povinné." }, { status: 400 });
    }

    const row = await supabase
      .from("video_progress")
      .select(PROGRESS_COLUMNS)
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
    const title = normalizeString(payload.title).slice(0, 500) || null;
    const thumbnailUrl = normalizeString(payload.thumbnailUrl).slice(0, 500) || null;
    const channelName = normalizeString(payload.channelName).slice(0, 200) || null;

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
          ...(title ? { title } : {}),
          ...(thumbnailUrl ? { thumbnail_url: thumbnailUrl } : {}),
          ...(channelName ? { channel_name: channelName } : {}),
        },
        {
          onConflict: "user_id,video_id",
        }
      )
      .select(PROGRESS_COLUMNS)
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
