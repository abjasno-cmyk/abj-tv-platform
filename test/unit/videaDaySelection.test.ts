import { describe, expect, it } from "vitest";

import type { FeedVideo } from "@/lib/dayOverview";
import { selectVideaVideosForTodayAndYesterday } from "@/lib/viewer/videaDaySelection";

function createVideo(videoId: string, publishedAt: string): FeedVideo {
  return {
    video_id: videoId,
    title: `Video ${videoId}`,
    channel: "ABJ TV",
    published_at: publishedAt,
    scheduled_start_at: null,
    video_type: "vod",
    topics: [],
    thumbnail: "/thumb.jpg",
    freshness: "today",
    duration_min: 30,
  };
}

describe("selectVideaVideosForTodayAndYesterday", () => {
  it("returns all videos from today and yesterday in Prague timezone", () => {
    const now = new Date("2026-07-18T10:00:00.000Z");
    const videos: FeedVideo[] = [
      createVideo("today-1", "2026-07-18T05:00:00.000Z"),
      createVideo("today-2", "2026-07-18T02:00:00.000Z"),
      createVideo("yesterday-1", "2026-07-17T18:00:00.000Z"),
      createVideo("older-1", "2026-07-16T20:00:00.000Z"),
    ];

    const selected = selectVideaVideosForTodayAndYesterday(videos, now);
    expect(selected.map((video) => video.video_id)).toEqual([
      "today-1",
      "today-2",
      "yesterday-1",
    ]);
  });

  it("deduplicates by video_id and keeps newest duplicate", () => {
    const now = new Date("2026-07-18T10:00:00.000Z");
    const olderDuplicate = createVideo("dup", "2026-07-18T00:30:00.000Z");
    const newerDuplicate = createVideo("dup", "2026-07-18T04:30:00.000Z");

    const selected = selectVideaVideosForTodayAndYesterday(
      [olderDuplicate, newerDuplicate],
      now,
    );
    expect(selected).toHaveLength(1);
    expect(selected[0]?.published_at).toBe("2026-07-18T04:30:00.000Z");
  });
});
