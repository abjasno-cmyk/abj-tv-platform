import { describe, it, expect } from "vitest";
import {
  filterNonShortVideos,
  isYouTubeShort,
  parseIsoDurationSeconds,
  YOUTUBE_SHORT_MAX_SECONDS,
} from "@/lib/youtubeShort";
import { selectLatestNonShortChannelVideos, LIVE_CHANNEL_VIDEO_DISPLAY_LIMIT } from "@/lib/liveChannelVideos";

describe("parseIsoDurationSeconds", () => {
  it("parses minute and second durations", () => {
    expect(parseIsoDurationSeconds("PT45S")).toBe(45);
    expect(parseIsoDurationSeconds("PT1M30S")).toBe(90);
  });

  it("returns null for invalid values", () => {
    expect(parseIsoDurationSeconds("")).toBeNull();
    expect(parseIsoDurationSeconds("nope")).toBeNull();
  });
});

describe("isYouTubeShort", () => {
  it("treats videos up to 60 seconds as shorts", () => {
    expect(isYouTubeShort({ durationIso: "PT60S" })).toBe(true);
    expect(isYouTubeShort({ durationMin: 1 })).toBe(true);
    expect(isYouTubeShort({ durationIso: "PT1M1S" })).toBe(false);
  });

  it("uses explicit isShort and title hints", () => {
    expect(isYouTubeShort({ isShort: true, durationIso: "PT10M" })).toBe(true);
    expect(isYouTubeShort({ title: "Novinka #shorts z dneška" })).toBe(true);
    expect(isYouTubeShort({ title: "Dlouhý rozhovor o politice" })).toBe(false);
  });

  it("documents the configured max short length", () => {
    expect(YOUTUBE_SHORT_MAX_SECONDS).toBe(60);
  });
});

describe("selectLatestNonShortChannelVideos", () => {
  it("returns up to the display limit and skips shorts", () => {
    const videos = Array.from({ length: 40 }, (_, index) => ({
      videoId: `v${index}`,
      title: `Video ${index}`,
      thumbnail: null,
      publishedAt: new Date(2026, 0, 20 - index).toISOString(),
      durationMin: index % 3 === 0 ? 0.5 : 12,
    }));

    const selected = selectLatestNonShortChannelVideos(videos);
    expect(selected.length).toBe(LIVE_CHANNEL_VIDEO_DISPLAY_LIMIT);
    expect(selected.every((video) => !isYouTubeShort(video))).toBe(true);
  });

  it("filterNonShortVideos removes all shorts from a mixed list", () => {
    const mixed = [
      { title: "A", durationIso: "PT30S" },
      { title: "B", durationIso: "PT20M" },
    ];
    expect(filterNonShortVideos(mixed)).toEqual([{ title: "B", durationIso: "PT20M" }]);
  });
});
