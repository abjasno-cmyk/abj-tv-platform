import { describe, expect, it } from "vitest";

import { buildVideoSlug, parseVideoSlug } from "@/lib/seo/slug";

describe("video SEO slug", () => {
  it("builds slug in title-date-videoId format", () => {
    expect(
      buildVideoSlug({
        title: "Jindřich Rajchl nový rozhovor",
        publishedAt: "2026-06-12T10:00:00.000Z",
        videoId: "lsg3k-Wh9vU",
      }),
    ).toBe("jindrich-rajchl-novy-rozhovor-2026-06-12-lsg3k-Wh9vU");
  });

  it("parses videoId from slug", () => {
    expect(parseVideoSlug("jindrich-rajchl-novy-rozhovor-2026-06-12-lsg3k-Wh9vU")).toEqual({
      videoId: "lsg3k-Wh9vU",
    });
  });

  it("rejects invalid slug", () => {
    expect(parseVideoSlug("bez-data")).toBeNull();
    expect(buildVideoSlug({ title: "", publishedAt: null, videoId: "abc" })).toBeNull();
  });
});
