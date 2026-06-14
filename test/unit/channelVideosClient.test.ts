import { describe, expect, it, vi } from "vitest";

import type { LiveChannelGroup } from "@/components/abj/ChannelDirectory";
import { fetchChannelVideosForKanaly } from "@/lib/kanaly/channelVideosClient";

describe("fetchChannelVideosForKanaly", () => {
  it("supplements thin cached feed from channel-latest API", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        videos: [
          {
            videoId: "api-1",
            title: "Nové video",
            thumbnail: null,
            publishedAt: "2026-06-08T10:00:00.000Z",
          },
          {
            videoId: "api-2",
            title: "Další video",
            thumbnail: null,
            publishedAt: "2026-06-07T10:00:00.000Z",
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const channel: LiveChannelGroup = {
      channelName: "Datarun",
      avatarUrl: null,
      channelId: "UC_STALE",
      channelUrl: "https://www.youtube.com/@Datarun_cz",
      videos: [
        {
          videoId: "old-1",
          title: "Starší pořad",
          thumbnail: null,
          publishedAt: "2025-01-01T10:00:00.000Z",
        },
      ],
    };

    const result = await fetchChannelVideosForKanaly(channel);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.videos.map((video) => video.videoId)).toEqual(["api-1", "api-2"]);
    expect(result.usedLatestFallback).toBe(false);

    vi.unstubAllGlobals();
  });

  it("uses cached feed when enough videos are already available", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const channel: LiveChannelGroup = {
      channelName: "Plný kanál",
      avatarUrl: null,
      channelId: "UC_FULL",
      channelUrl: "https://www.youtube.com/@full",
      videos: Array.from({ length: 24 }, (_, index) => ({
        videoId: `video-${index + 1}`,
        title: `Video ${index + 1}`,
        thumbnail: null,
        publishedAt: `2026-06-${String(14 - (index % 7)).padStart(2, "0")}T10:00:00.000Z`,
      })),
    };

    const result = await fetchChannelVideosForKanaly(channel);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.videos).toHaveLength(24);
    expect(result.usedLatestFallback).toBe(false);

    vi.unstubAllGlobals();
  });
});
