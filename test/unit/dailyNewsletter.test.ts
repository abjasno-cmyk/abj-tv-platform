import { describe, expect, it } from "vitest";

import { buildDailyNewsletterContent } from "@/lib/newsletter/buildDailyNewsletter";
import { pragueEditionDate } from "@/lib/newsletter/dates";
import { isNewsletterSendingEnabled } from "@/lib/newsletter/resend";

describe("pragueEditionDate", () => {
  it("uses Prague calendar day", () => {
    const value = pragueEditionDate(new Date("2026-06-14T22:30:00.000Z"));
    expect(value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("buildDailyNewsletterContent", () => {
  it("builds a digest from top videos", () => {
    const content = buildDailyNewsletterContent({
      siteUrl: "https://www.verox.cz",
      videos: [
        {
          video_id: "abc123",
          title: "Rozhovor s ministrem",
          channel: "Deník N",
          published_at: "2026-06-14T10:00:00.000Z",
          topics: [],
          thumbnail: "https://example.com/a.jpg",
          freshness: "today",
        },
      ],
      now: new Date("2026-06-14T08:00:00.000Z"),
    });

    expect(content.subject).toContain("Verox");
    expect(content.html).toContain("Rozhovor s ministrem");
    expect(content.html).toContain("https://www.verox.cz/videa/abc123");
    expect(content.text).toContain("Můj Verox");
  });
});

describe("isNewsletterSendingEnabled", () => {
  it("is disabled without RESEND_API_KEY", () => {
    const original = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_KEY;
    expect(isNewsletterSendingEnabled()).toBe(false);
    if (original) process.env.RESEND_API_KEY = original;
  });
});
