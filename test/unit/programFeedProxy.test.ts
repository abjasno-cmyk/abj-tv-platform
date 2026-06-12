import { describe, expect, it, vi } from "vitest";

import { buildTranscriptUrlCandidates } from "@/lib/programFeedProxy";

describe("buildTranscriptUrlCandidates", () => {
  it("derives transcript URL from PROGRAM_FEED_URL origin", () => {
    vi.stubEnv("PROGRAM_FEED_URL", "https://feed.example.com:8000/program");
    vi.stubEnv("NEXT_PUBLIC_REPLIT_URL", "");

    const candidates = buildTranscriptUrlCandidates("lsg3k-Wh9vU");
    expect(candidates).toContain("https://feed.example.com:8000/transcript/lsg3k-Wh9vU");
  });

  it("includes replit base fallback", () => {
    vi.stubEnv("PROGRAM_FEED_URL", "");
    vi.stubEnv("NEXT_PUBLIC_REPLIT_URL", "https://custom.replit.app");

    const candidates = buildTranscriptUrlCandidates("abc123XYZ-_");
    expect(candidates).toContain("https://custom.replit.app/transcript/abc123XYZ-_");
    expect(candidates).toContain("https://attached-assets-abjasno.replit.app/transcript/abc123XYZ-_");
  });
});
