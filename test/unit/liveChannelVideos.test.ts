import { describe, expect, it } from "vitest";

import {
  CHANNEL_VIDEO_LOOKBACK_DAYS,
  filterChannelVideosWithinDays,
} from "@/lib/liveChannelVideos";

describe("filterChannelVideosWithinDays", () => {
  const nowMs = Date.parse("2026-06-09T12:00:00.000Z");

  it("keeps videos published within the lookback window", () => {
    const videos = [
      { videoId: "fresh", publishedAt: "2026-06-08T10:00:00.000Z" },
      { videoId: "old", publishedAt: "2026-05-20T10:00:00.000Z" },
    ];

    const filtered = filterChannelVideosWithinDays(videos, CHANNEL_VIDEO_LOOKBACK_DAYS, nowMs);

    expect(filtered.map((video) => video.videoId)).toEqual(["fresh"]);
  });

  it("drops videos with invalid publish dates", () => {
    const videos = [{ videoId: "broken", publishedAt: "not-a-date" }];
    expect(filterChannelVideosWithinDays(videos, CHANNEL_VIDEO_LOOKBACK_DAYS, nowMs)).toEqual([]);
  });
});
