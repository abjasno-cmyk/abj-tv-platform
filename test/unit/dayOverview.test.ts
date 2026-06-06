import { describe, it, expect } from "vitest";
import {
  parsePublishedTimestamp,
  deduplicateVideos,
  videoUniqKey,
  deduplicateBySeen,
  filterVideosWithinHours,
  groupChannelsForDisplay,
  buildStructuredFeedPayload,
  TOPIC_ORDER,
  type FeedVideo,
} from "@/lib/dayOverview";
import type { CachedVideo } from "@/lib/epg-types";

function feed(over: Partial<FeedVideo> & Pick<FeedVideo, "video_id">): FeedVideo {
  return {
    title: over.video_id,
    channel: "VEROX",
    published_at: "2026-06-01T10:00:00.000Z",
    topics: [],
    thumbnail: "/t.jpg",
    freshness: "evergreen",
    ...over,
  } as FeedVideo;
}

function raw(over: Partial<CachedVideo> & Pick<CachedVideo, "video_id">): CachedVideo {
  return {
    id: `row-${over.video_id}`,
    source_id: null,
    channel_id: "c1",
    title: over.video_id,
    thumbnail: null,
    published_at: "2026-06-01T10:00:00.000Z",
    scheduled_start_at: null,
    video_type: "vod",
    channel_name: "VEROX",
    is_abj: false,
    created_at: "2026-06-01T10:00:00.000Z",
    ...over,
  } as CachedVideo;
}

describe("parsePublishedTimestamp", () => {
  it("parses an ISO date to epoch ms", () => {
    expect(parsePublishedTimestamp("2026-06-01T00:00:00.000Z")).toBe(Date.parse("2026-06-01T00:00:00.000Z"));
  });
  it("returns 0 for null/undefined/garbage", () => {
    expect(parsePublishedTimestamp(null)).toBe(0);
    expect(parsePublishedTimestamp(undefined)).toBe(0);
    expect(parsePublishedTimestamp("not-a-date")).toBe(0);
  });
});

describe("deduplicateVideos", () => {
  it("drops repeated video ids", () => {
    const out = deduplicateVideos([feed({ video_id: "a" }), feed({ video_id: "a" }), feed({ video_id: "b" })]);
    expect(out.map((v) => v.video_id)).toEqual(["a", "b"]);
  });

  it("drops duplicates by normalized title+channel even with different ids", () => {
    const out = deduplicateVideos([
      feed({ video_id: "1", title: "Zprávy", channel: "ČT" }),
      feed({ video_id: "2", title: "ZPRÁVY", channel: "ct" }),
    ]);
    expect(out).toHaveLength(1);
  });
});

describe("videoUniqKey / deduplicateBySeen", () => {
  it("uses video id when present, else title|channel", () => {
    expect(videoUniqKey(feed({ video_id: "xyz" }))).toBe("xyz");
    expect(videoUniqKey(feed({ video_id: "", title: "Hi", channel: "VX" }))).toBe("hi|vx");
  });

  it("returns false on a second sighting of the same key", () => {
    const seen = new Set<string>();
    expect(deduplicateBySeen(feed({ video_id: "a" }), seen)).toBe(true);
    expect(deduplicateBySeen(feed({ video_id: "a" }), seen)).toBe(false);
  });
});

describe("groupChannelsForDisplay", () => {
  it("sorts channels by (deduped) video count and respects the limit", () => {
    const grouped = groupChannelsForDisplay(
      {
        Small: [feed({ video_id: "s1" })],
        Big: [feed({ video_id: "b1" }), feed({ video_id: "b2" }), feed({ video_id: "b3" })],
        Mid: [feed({ video_id: "m1" }), feed({ video_id: "m2" })],
      },
      2,
    );
    expect(grouped.map((g) => g.channel)).toEqual(["Big", "Mid"]);
  });
});

describe("filterVideosWithinHours", () => {
  it("keeps only videos published inside the rolling window", () => {
    const now = Date.now();
    const recent = new Date(now - 2 * 60 * 60 * 1000).toISOString();
    const old = new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString();
    const filtered = filterVideosWithinHours(
      [feed({ video_id: "new", published_at: recent }), feed({ video_id: "old", published_at: old })],
      168,
    );
    expect(filtered.map((video) => video.video_id)).toEqual(["new"]);
  });
});

describe("buildStructuredFeedPayload", () => {
  it("returns top/topics/channels with topic keys always present", () => {
    const payload = buildStructuredFeedPayload([
      raw({ video_id: "v1", title: "Volby a vláda", channel_name: "Politik" }),
      raw({ video_id: "v2", title: "Inflace a rozpočet", channel_name: "Ekonom" }),
    ]);
    expect(Object.keys(payload.topics).sort()).toEqual([...TOPIC_ORDER].sort());
    expect(payload.top.length).toBeGreaterThan(0);
    expect(payload.channels.Politik?.length).toBe(1);
  });

  it("orders top by newest published_at", () => {
    const payload = buildStructuredFeedPayload([
      raw({ video_id: "old", published_at: "2026-05-01T00:00:00.000Z" }),
      raw({ video_id: "new", published_at: "2026-06-01T00:00:00.000Z", title: "new", channel_name: "B" }),
    ]);
    expect(payload.top[0].video_id).toBe("new");
  });
});
