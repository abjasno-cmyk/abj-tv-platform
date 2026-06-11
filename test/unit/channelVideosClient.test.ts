import { describe, expect, it, vi } from "vitest";

import type { LiveChannelGroup } from "@/components/abj/ChannelDirectory";
import { fetchChannelVideosForKanaly } from "@/lib/kanaly/channelVideosClient";

describe("fetchChannelVideosForKanaly", () => {
  it("uses cached feed videos even when only older than the lookback window", async () => {
    const fetchMock = vi.fn();
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

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.videos.map((video) => video.videoId)).toEqual(["old-1"]);
    expect(result.usedLatestFallback).toBe(true);

    vi.unstubAllGlobals();
  });
});
