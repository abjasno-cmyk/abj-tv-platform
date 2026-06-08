import { describe, expect, it } from "vitest";

import {
  formatVideoReleaseDateBadge,
  getVideoReleaseBadgeLabel,
  isScheduledPremiere,
  resolveVideoReleaseIso,
} from "@/lib/viewer/videoReleaseDate";

const NOW = Date.parse("2026-06-08T10:00:00.000Z");

describe("videoReleaseDate", () => {
  it("prefers future scheduled premiere over publish date", () => {
    const source = {
      publishedAt: "2026-06-01T10:00:00.000Z",
      scheduledStartAt: "2026-06-10T18:00:00.000Z",
      videoType: "upcoming" as const,
    };

    expect(resolveVideoReleaseIso(source, NOW)).toBe("2026-06-10T18:00:00.000Z");
    expect(isScheduledPremiere(source, NOW)).toBe(true);
    expect(getVideoReleaseBadgeLabel(source, NOW)).toMatch(/^Premiéra /);
  });

  it("falls back to published date for regular videos", () => {
    const source = {
      publishedAt: "2026-06-01T10:00:00.000Z",
      scheduledStartAt: null,
      videoType: "vod" as const,
    };

    expect(resolveVideoReleaseIso(source, NOW)).toBe("2026-06-01T10:00:00.000Z");
    expect(isScheduledPremiere(source, NOW)).toBe(false);
    expect(getVideoReleaseBadgeLabel(source, NOW)).toBe("1. 6. 2026");
  });

  it("uses publish date when scheduled premiere is already in the past", () => {
    const source = {
      publishedAt: "2026-06-07T10:00:00.000Z",
      scheduledStartAt: "2026-06-07T08:00:00.000Z",
      videoType: "upcoming" as const,
    };

    expect(resolveVideoReleaseIso(source, NOW)).toBe("2026-06-07T10:00:00.000Z");
    expect(isScheduledPremiere(source, NOW)).toBe(false);
  });

  it("returns null for invalid dates", () => {
    expect(formatVideoReleaseDateBadge("not-a-date")).toBeNull();
    expect(resolveVideoReleaseIso({ publishedAt: "bad", videoType: "vod" }, NOW)).toBeNull();
  });
});
