import "server-only";

import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PlaylistItem } from "@/lib/types";

type SourcePriority = "A" | "B" | "C";

type SourceRow = {
  id: string;
  source_name: string;
  channel_url: string;
  priority: SourcePriority;
};

type YoutubeChannelsResponse = {
  items?: Array<{ id?: string }>;
};

type YoutubeSearchResponse = {
  items?: Array<{
    id?: { videoId?: string };
    snippet?: {
      title?: string;
      publishedAt?: string;
    };
  }>;
};

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";
const PRIORITY_RESULTS: Record<SourcePriority, number> = {
  A: 2,
  B: 1,
  C: 1,
};

function getYouTubeApiKey(): string {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error("YOUTUBE_API_KEY not set");
  }
  return apiKey;
}

export function extractYoutubeHandle(channelUrl: string): string | null {
  const normalizedUrl = channelUrl.trim();
  if (!normalizedUrl) {
    return null;
  }

  try {
    const parsed = new URL(normalizedUrl);
    const [firstSegment] = parsed.pathname.split("/").filter(Boolean);
    if (!firstSegment || !firstSegment.startsWith("@")) {
      return null;
    }
    return firstSegment;
  } catch {
    return null;
  }
}

export const resolveChannelIdFromHandle = cache(async (handle: string): Promise<string | null> => {
  const apiKey = getYouTubeApiKey();
  const normalizedHandle = handle.trim().startsWith("@") ? handle.trim().slice(1) : handle.trim();
  if (!normalizedHandle) {
    return null;
  }

  const url = new URL(`${YOUTUBE_API_BASE}/channels`);
  url.searchParams.set("part", "id");
  url.searchParams.set("forHandle", normalizedHandle);
  url.searchParams.set("key", apiKey);

  const response = await fetch(url.toString(), { next: { revalidate: 1800 } });
  if (!response.ok) {
    throw new Error(`YouTube channels API failed (${response.status})`);
  }

  const data = (await response.json()) as YoutubeChannelsResponse;
  return data.items?.[0]?.id ?? null;
});

export const fetchLatestVideos = cache(
  async (
    channelId: string,
    maxResults: number,
    channelName: string,
    sourceId?: string
  ): Promise<PlaylistItem[]> => {
    const apiKey = getYouTubeApiKey();

    const url = new URL(`${YOUTUBE_API_BASE}/search`);
    url.searchParams.set("part", "snippet");
    url.searchParams.set("channelId", channelId);
    url.searchParams.set("order", "date");
    url.searchParams.set("type", "video");
    url.searchParams.set("maxResults", String(maxResults));
    url.searchParams.set("key", apiKey);

    const response = await fetch(url.toString(), { next: { revalidate: 1800 } });
    if (!response.ok) {
      throw new Error(`YouTube search API failed (${response.status})`);
    }

    const data = (await response.json()) as YoutubeSearchResponse;
    const items = data.items ?? [];

    return items
      .map((item) => {
        const videoId = item.id?.videoId;
        const title = item.snippet?.title;
        if (!videoId || !title) {
          return null;
        }

        return {
          videoId,
          title,
          channelName,
          sourceId,
          publishedAt: item.snippet?.publishedAt,
        } satisfies PlaylistItem;
      })
      .filter((item): item is PlaylistItem => item !== null);
  }
);

export async function buildPlaylist(): Promise<PlaylistItem[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("sources")
    .select("id, source_name, channel_url, priority")
    .eq("platform", "youtube")
    .eq("active", true)
    .order("priority", { ascending: true })
    .order("source_name", { ascending: true });

  if (error) {
    throw new Error(`Failed to load sources: ${error.message}`);
  }

  const sources = (data ?? []) as SourceRow[];
  const playlist: PlaylistItem[] = [];

  for (const source of sources) {
    try {
      const handle = extractYoutubeHandle(source.channel_url);
      if (!handle) {
        continue;
      }

      const channelId = await resolveChannelIdFromHandle(handle);
      if (!channelId) {
        continue;
      }

      const maxResults = PRIORITY_RESULTS[source.priority] ?? 1;
      const latestVideos = await fetchLatestVideos(
        channelId,
        maxResults,
        source.source_name,
        source.id
      );

      if (latestVideos.length > 0) {
        playlist.push(...latestVideos);
      }
    } catch (err) {
      console.error(
        `Failed to process source "${source.source_name}" (${source.id})`,
        err
      );
    }
  }

  return playlist;
}
