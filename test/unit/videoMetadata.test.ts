import { describe, expect, it } from "vitest";

import { buildMyVeroxLibraryFromRows } from "@/lib/viewer/myVeroxLibrary";
import { liveVideoHref, normalizeChannelFollowId, resolveVideoThumbnail, resolveVideoTitle } from "@/lib/viewer/videoMetadata";

describe("videoMetadata", () => {
  it("builds fallback thumbnail and title", () => {
    expect(resolveVideoThumbnail("abc123", null)).toBe("https://img.youtube.com/vi/abc123/hqdefault.jpg");
    expect(resolveVideoTitle("abc123", "")).toBe("Video abc123");
    expect(resolveVideoTitle("abc123", "Rozhovor")).toBe("Rozhovor");
  });

  it("builds live deep link with title and channel", () => {
    const href = liveVideoHref({ videoId: "abc123", title: "Rozhovor", channelName: "DVTV" });
    expect(href).toContain("videoId=abc123");
    expect(href).toContain("title=");
    expect(href).toContain("channel=DVTV");
  });

  it("normalizes channel follow id fallback", () => {
    expect(normalizeChannelFollowId(null, "Česká televize")).toBe("source:ceska-televize");
  });
});

describe("buildMyVeroxLibraryFromRows", () => {
  it("maps saved, watched and followed channels", () => {
    const library = buildMyVeroxLibraryFromRows({
      savedRows: [
        {
          video_id: "vid1",
          title: "Uložené video",
          thumbnail_url: null,
          channel_name: "Kanál A",
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ],
      progressRows: [
        {
          video_id: "vid2",
          title: "Dokoukané",
          thumbnail_url: null,
          channel_name: "Kanál B",
          progress_percent: 95,
          completed: true,
          last_watched_at: "2026-01-02T00:00:00.000Z",
        },
        {
          video_id: "vid3",
          title: "Rozkoukané",
          thumbnail_url: null,
          channel_name: null,
          progress_percent: 40,
          completed: false,
          last_watched_at: "2026-01-03T00:00:00.000Z",
        },
      ],
      followRows: [{ channel_id: "UC123", created_at: "2026-01-04T00:00:00.000Z" }],
      catalog: [
        {
          channelName: "Kanál C",
          channelId: "UC123",
          avatarUrl: "https://example.com/a.jpg",
          channelUrl: null,
          videos: [],
        },
      ],
    });

    expect(library.savedVideos).toHaveLength(1);
    expect(library.savedVideos[0]?.title).toBe("Uložené video");
    expect(library.watchedVideos).toHaveLength(1);
    expect(library.continueWatching).toHaveLength(1);
    expect(library.followedChannels[0]?.channelName).toBe("Kanál C");
    expect(library.followedChannels[0]?.avatarUrl).toBe("https://example.com/a.jpg");
  });
});
