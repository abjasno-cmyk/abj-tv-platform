import { describe, expect, it } from "vitest";

import {
  CHANNEL_VIDEO_LOOKBACK_DAYS,
  filterChannelVideosWithinDays,
  selectKanalyChannelVideos,
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

describe("selectKanalyChannelVideos", () => {
  const nowMs = Date.parse("2026-06-09T12:00:00.000Z");

  it("prefers videos from the lookback window", () => {
    const videos = [
      {
        videoId: "fresh",
        title: "Fresh",
        thumbnail: null,
        publishedAt: "2026-06-08T10:00:00.000Z",
      },
      {
        videoId: "old",
        title: "Old",
        thumbnail: null,
        publishedAt: "2026-05-01T10:00:00.000Z",
      },
    ];

    const result = selectKanalyChannelVideos(videos, nowMs);

    expect(result.usedLatestFallback).toBe(false);
    expect(result.videos.map((video) => video.videoId)).toEqual(["fresh"]);
  });

  it("falls back to latest videos when the lookback window is empty", () => {
    const videos = [
      {
        videoId: "old",
        title: "Old",
        thumbnail: null,
        publishedAt: "2026-05-01T10:00:00.000Z",
      },
    ];

    const result = selectKanalyChannelVideos(videos, nowMs);

    expect(result.usedLatestFallback).toBe(true);
    expect(result.videos.map((video) => video.videoId)).toEqual(["old"]);
  });
});
