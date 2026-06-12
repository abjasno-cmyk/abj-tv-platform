import { afterEach, describe, expect, it, vi } from "vitest";

import { buildTranscriptUrlCandidates, fetchTranscriptUpstream } from "@/lib/programFeedProxy";

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

describe("fetchTranscriptUpstream", () => {
  const request = new Request("https://verox.cz/api/transcript/abc123XYZ-_");

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("treats JSON 404 as unavailable instead of trying more hosts", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("", {
        status: 404,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchTranscriptUpstream(
      ["https://feed.example/transcript/abc123XYZ-_"],
      request,
      "test-key",
      "abc123XYZ-_",
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.response?.status).toBe(200);
    const payload = (await result.response?.json()) as { status: string; video_id: string };
    expect(payload.status).toBe("unavailable");
    expect(payload.video_id).toBe("abc123XYZ-_");
  });

  it("skips HTML deployment placeholder and tries the next host", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response("<!DOCTYPE html><html><body>not live</body></html>", {
          status: 404,
          headers: { "Content-Type": "text/html" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            video_id: "abc123XYZ-_",
            status: "ready",
            transcript: "OK",
            transcript_at: null,
            transcript_original: null,
            source_lang: null,
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchTranscriptUpstream(
      [
        "https://dead.replit.app/transcript/abc123XYZ-_",
        "https://live.replit.app/transcript/abc123XYZ-_",
      ],
      request,
      "test-key",
      "abc123XYZ-_",
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.response?.status).toBe(200);
    const payload = (await result.response?.json()) as { status: string; transcript: string };
    expect(payload.status).toBe("ready");
    expect(payload.transcript).toBe("OK");
  });
});
