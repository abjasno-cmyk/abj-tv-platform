import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { LiveChannelGroup } from "@/components/abj/ChannelDirectory";
import { fetchChannelVideosForKanaly, fetchExpandedChannelVideosForKanaly } from "@/lib/kanaly/channelVideosClient";
import { LIVE_CHANNEL_VIDEO_EXPANDED_LIMIT } from "@/lib/liveChannelVideos";

describe("fetchChannelVideosForKanaly", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-14T10:00:00.000Z"));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

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
  });

  it("loads up to 100 latest videos without the 7-day window", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        videos: Array.from({ length: 100 }, (_, index) => ({
          videoId: `api-${index + 1}`,
          title: `Video ${index + 1}`,
          thumbnail: null,
          publishedAt: `2026-0${index < 50 ? 5 : 6}-${String((index % 28) + 1).padStart(2, "0")}T10:00:00.000Z`,
        })),
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const channel: LiveChannelGroup = {
      channelName: "Datarun",
      avatarUrl: null,
      channelId: "UC_STALE",
      channelUrl: "https://www.youtube.com/@Datarun_cz",
      videos: [],
    };

    const videos = await fetchExpandedChannelVideosForKanaly(channel);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const requestedUrl = String(fetchMock.mock.calls[0]?.[0] ?? "");
    expect(requestedUrl).toContain(`limit=${LIVE_CHANNEL_VIDEO_EXPANDED_LIMIT}`);
    expect(videos).toHaveLength(100);
  });
});
