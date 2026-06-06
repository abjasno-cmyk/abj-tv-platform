import { describe, expect, it } from "vitest";

import {
  buildVideoLookupFromCatalog,
  buildVideoLookupFromStructuredFeed,
  collectVideoIdsNeedingTitleHydration,
  mergeVideoLookups,
} from "@/lib/viewer/hydrateVideoMetadata";
import { buildMyVeroxLibraryFromRows } from "@/lib/viewer/myVeroxLibrary";
import { isPlaceholderVideoTitle, placeholderVideoTitle, resolveVideoTitle } from "@/lib/viewer/videoMetadata";

describe("video title placeholders", () => {
  it("detects generated fallback titles", () => {
    expect(placeholderVideoTitle("abc123")).toBe("Video abc123");
    expect(isPlaceholderVideoTitle("abc123", "")).toBe(true);
    expect(isPlaceholderVideoTitle("abc123", "Video abc123")).toBe(true);
    expect(isPlaceholderVideoTitle("abc123", "Skutečný název")).toBe(false);
    expect(resolveVideoTitle("abc123", "Video abc123")).toBe("Video abc123");
    expect(resolveVideoTitle("abc123", "Skutečný název")).toBe("Skutečný název");
  });
});

describe("hydrateVideoMetadata helpers", () => {
  it("builds lookup from catalog and feed", () => {
    const catalogLookup = buildVideoLookupFromCatalog([
      {
        channelName: "Kanál A",
        channelId: "UC1",
        avatarUrl: null,
        channelUrl: null,
        videos: [{ videoId: "vid1", title: "Z kanálu", thumbnail: null, publishedAt: "2026-01-01" }],
      },
    ]);
    const feedLookup = buildVideoLookupFromStructuredFeed({
      top: [
        {
          video_id: "vid2",
          title: "Z feedu",
          channel: "Kanál B",
          published_at: "2026-01-02",
          topics: [],
          thumbnail: "https://example.com/vid2.jpg",
          freshness: "today",
        },
      ],
      topics: {},
      channels: {},
    });

    const merged = mergeVideoLookups(catalogLookup, feedLookup);
    expect(merged.get("vid1")?.title).toBe("Z kanálu");
    expect(merged.get("vid2")?.title).toBe("Z feedu");
    expect(collectVideoIdsNeedingTitleHydration([{ video_id: "vid3", title: null }])).toEqual(["vid3"]);
    expect(
      collectVideoIdsNeedingTitleHydration([{ video_id: "vid3", title: placeholderVideoTitle("vid3") }]),
    ).toEqual(["vid3"]);
    expect(collectVideoIdsNeedingTitleHydration([{ video_id: "vid3", title: "Hotovo" }])).toEqual([]);
  });
});

describe("buildMyVeroxLibraryFromRows hydration", () => {
  it("uses hydrated metadata for placeholder titles", () => {
    const lookup = new Map([
      [
        "vid-placeholder",
        {
          title: "Skutečný název videa",
          channelName: "Kanál C",
        },
      ],
    ]);

    const library = buildMyVeroxLibraryFromRows({
      savedRows: [],
      progressRows: [
        {
          video_id: "vid-placeholder",
          title: "Video vid-placeholder",
          thumbnail_url: null,
          channel_name: null,
          progress_percent: 40,
          completed: false,
          last_watched_at: "2026-01-03T00:00:00.000Z",
        },
      ],
      followRows: [],
      catalog: [],
      metadataLookup: lookup,
    });

    expect(library.continueWatching[0]?.title).toBe("Skutečný název videa");
    expect(library.continueWatching[0]?.channelName).toBe("Kanál C");
    expect(library.continueWatching[0]?.href).toContain("title=");
  });
});
