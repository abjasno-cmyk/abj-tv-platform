import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getNowPlaying, getProgram } from "@/lib/programEngine";

export type LiveCommentsVideoOption = {
  videoId: string;
  title: string;
  channel: string | null;
  startsAt: string | null;
  endsAt: string | null;
  blockType: string | null;
  isNowPlaying: boolean;
  source: "program" | "search";
};

function normalizeVideoId(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function escapeIlikePattern(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
}

export async function listLiveCommentsProgramVideos(): Promise<LiveCommentsVideoOption[]> {
  const [timeline, nowPlaying] = await Promise.all([getProgram(), getNowPlaying()]);
  const nowPlayingId = normalizeVideoId(nowPlaying?.videoId ?? null);
  const seen = new Set<string>();
  const options: LiveCommentsVideoOption[] = [];

  for (const block of timeline) {
    const videoId = normalizeVideoId(block.videoId);
    if (!videoId || seen.has(videoId)) continue;
    seen.add(videoId);
    options.push({
      videoId,
      title: block.title.trim() || videoId,
      channel: block.channel?.trim() || null,
      startsAt: block.start ?? null,
      endsAt: block.end ?? null,
      blockType: block.type ?? null,
      isNowPlaying: videoId === nowPlayingId,
      source: "program",
    });
  }

  return options;
}

export async function searchLiveCommentsVideosByTitle(
  supabase: SupabaseClient,
  query: string,
  limit = 24,
): Promise<LiveCommentsVideoOption[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const pattern = `%${escapeIlikePattern(trimmed)}%`;
  const { data, error } = await supabase
    .from("videos")
    .select("video_id, title, channel_name, published_at")
    .ilike("title", pattern)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    console.error("live-comments-video-search-failed", error.message);
    return [];
  }

  const seen = new Set<string>();
  const options: LiveCommentsVideoOption[] = [];

  for (const row of data ?? []) {
    const videoId = normalizeVideoId((row as { video_id?: string }).video_id);
    if (!videoId || seen.has(videoId)) continue;
    seen.add(videoId);
    const title = typeof (row as { title?: string }).title === "string" ? row.title.trim() : "";
    const channel =
      typeof (row as { channel_name?: string }).channel_name === "string"
        ? row.channel_name.trim()
        : null;
    const publishedAt =
      typeof (row as { published_at?: string }).published_at === "string"
        ? row.published_at
        : null;

    options.push({
      videoId,
      title: title || videoId,
      channel: channel || null,
      startsAt: publishedAt,
      endsAt: null,
      blockType: null,
      isNowPlaying: false,
      source: "search",
    });
  }

  return options;
}
