import { AuthApiError, requireAuthenticatedUser } from "@/lib/supabase/authenticated-server";
import { resolveVideoThumbnail, resolveVideoTitle } from "@/lib/viewer/videoMetadata";

export const dynamic = "force-dynamic";

type SavedVideoPayload = {
  videoId?: unknown;
  title?: unknown;
  thumbnailUrl?: unknown;
  channelName?: unknown;
};

function normalizeString(value: unknown, max = 500): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function GET() {
  try {
    const { supabase, user } = await requireAuthenticatedUser();
    const rows = await supabase
      .from("saved_videos")
      .select("video_id, title, thumbnail_url, channel_name, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (rows.error) {
      return Response.json({ error: "Nepodařilo se načíst uložená videa." }, { status: 500 });
    }

    return Response.json({
      videos: (rows.data ?? []).map((row) => ({
        videoId: row.video_id,
        title: resolveVideoTitle(row.video_id, row.title),
        thumbnailUrl: resolveVideoThumbnail(row.video_id, row.thumbnail_url),
        channelName: row.channel_name,
        savedAt: row.created_at,
      })),
    });
  } catch (error) {
    if (error instanceof AuthApiError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Nepodařilo se načíst uložená videa." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireAuthenticatedUser();
    const payload = (await request.json().catch(() => ({}))) as SavedVideoPayload;
    const videoId = normalizeString(payload.videoId, 160);
    if (!videoId) {
      return Response.json({ error: "videoId je povinné." }, { status: 400 });
    }

    const title = normalizeString(payload.title, 500) || resolveVideoTitle(videoId, null);
    const thumbnailUrl =
      normalizeString(payload.thumbnailUrl, 500) || resolveVideoThumbnail(videoId, null);
    const channelName = normalizeString(payload.channelName, 200) || null;

    const insert = await supabase.from("saved_videos").upsert(
      {
        user_id: user.id,
        video_id: videoId,
        title,
        thumbnail_url: thumbnailUrl,
        channel_name: channelName,
      },
      { onConflict: "user_id,video_id" },
    );

    if (insert.error) {
      const message =
        insert.error.code === "42P01"
          ? "Chybí tabulka saved_videos. Spusťte migraci 011_viewer_library.sql v Supabase."
          : "Uložení videa selhalo.";
      return Response.json({ error: message }, { status: 500 });
    }

    await supabase.from("viewer_activity").insert({
      user_id: user.id,
      event_type: "video_saved",
      entity_type: "video",
      entity_id: videoId,
      metadata: { title, channel_name: channelName },
    });

    return Response.json({ ok: true, saved: true });
  } catch (error) {
    if (error instanceof AuthApiError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Uložení videa selhalo." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { supabase, user } = await requireAuthenticatedUser();
    const url = new URL(request.url);
    const videoId = normalizeString(url.searchParams.get("videoId"), 160);
    if (!videoId) {
      return Response.json({ error: "videoId je povinné." }, { status: 400 });
    }

    const remove = await supabase.from("saved_videos").delete().eq("user_id", user.id).eq("video_id", videoId);
    if (remove.error) {
      return Response.json({ error: "Odebrání videa selhalo." }, { status: 500 });
    }

    await supabase.from("viewer_activity").insert({
      user_id: user.id,
      event_type: "video_unsaved",
      entity_type: "video",
      entity_id: videoId,
      metadata: {},
    });

    return Response.json({ ok: true, saved: false });
  } catch (error) {
    if (error instanceof AuthApiError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Odebrání videa selhalo." }, { status: 500 });
  }
}
