import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { fetchVideoTranscriptServer } from "@/lib/transcriptFetchServer";
import type { TranscriptResponse } from "@/lib/transcriptTypes";

vi.mock("@/lib/programFeedProxy", () => ({
  buildTranscriptUrlCandidates: vi.fn(() => ["https://feed.example/transcript/abc123XYZ-_"]),
  fetchFirstUpstream: vi.fn(),
  resolveFeedApiKey: vi.fn(() => "test-key"),
}));

vi.mock("@/lib/transcriptYouTubeFallback", () => ({
  fetchYouTubeTranscriptResponse: vi.fn(),
}));

import { fetchFirstUpstream } from "@/lib/programFeedProxy";
import { fetchYouTubeTranscriptResponse } from "@/lib/transcriptYouTubeFallback";

const mockedFetchFirstUpstream = vi.mocked(fetchFirstUpstream);
const mockedFetchYouTube = vi.mocked(fetchYouTubeTranscriptResponse);

function jsonResponse(payload: TranscriptResponse, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("fetchVideoTranscriptServer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns ready upstream transcript without calling YouTube fallback", async () => {
    mockedFetchFirstUpstream.mockResolvedValue({
      response: jsonResponse({
        video_id: "abc123XYZ-_",
        status: "ready",
        transcript: "Hotový přepis z feedu.",
        transcript_at: "2026-06-12T10:00:00.000Z",
      }),
      resolvedUrl: "https://feed.example/transcript/abc123XYZ-_",
      upstreamAttempts: [],
      lastNetworkError: null,
    });

    const result = await fetchVideoTranscriptServer("abc123XYZ-_");
    expect(result?.status).toBe("ready");
    expect(result?.transcript).toContain("feedu");
    expect(mockedFetchYouTube).not.toHaveBeenCalled();
  });

  it("keeps processing upstream response for polling", async () => {
    mockedFetchFirstUpstream.mockResolvedValue({
      response: jsonResponse({
        video_id: "abc123XYZ-_",
        status: "processing",
        transcript: null,
        transcript_at: null,
      }),
      resolvedUrl: "https://feed.example/transcript/abc123XYZ-_",
      upstreamAttempts: [],
      lastNetworkError: null,
    });

    const result = await fetchVideoTranscriptServer("abc123XYZ-_");
    expect(result?.status).toBe("processing");
    expect(mockedFetchYouTube).not.toHaveBeenCalled();
  });

  it("falls back to YouTube when upstream transcript endpoint is missing", async () => {
    mockedFetchFirstUpstream.mockResolvedValue({
      response: null,
      resolvedUrl: "",
      upstreamAttempts: ["https://feed.example/transcript/abc123XYZ-_ => 404"],
      lastNetworkError: null,
    });
    mockedFetchYouTube.mockResolvedValue({
      video_id: "abc123XYZ-_",
      status: "ready",
      transcript: "Přepis z YouTube.",
      transcript_at: "2026-06-12T11:00:00.000Z",
    });

    const result = await fetchVideoTranscriptServer("abc123XYZ-_");
    expect(mockedFetchYouTube).toHaveBeenCalledWith("abc123XYZ-_");
    expect(result?.transcript).toBe("Přepis z YouTube.");
  });

  it("falls back to YouTube when upstream returns unavailable", async () => {
    mockedFetchFirstUpstream.mockResolvedValue({
      response: jsonResponse({
        video_id: "abc123XYZ-_",
        status: "unavailable",
        transcript: null,
        transcript_at: null,
      }),
      resolvedUrl: "https://feed.example/transcript/abc123XYZ-_",
      upstreamAttempts: [],
      lastNetworkError: null,
    });
    mockedFetchYouTube.mockResolvedValue({
      video_id: "abc123XYZ-_",
      status: "ready",
      transcript: "Záložní přepis.",
      transcript_at: null,
    });

    const result = await fetchVideoTranscriptServer("abc123XYZ-_");
    expect(result?.transcript).toBe("Záložní přepis.");
  });
});
