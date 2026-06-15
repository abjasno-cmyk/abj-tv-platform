import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { fetchVideoTranscriptServer, TranscriptProviderError } from "@/lib/transcriptFetchServer";

describe("fetchVideoTranscriptServer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.VEROX_TRANSCRIPTS_BASE_URL = "https://attached-assets-abjasno.replit.app/transcripts/verox-news";
    process.env.VEROX_TRANSCRIPTS_API_KEY = "test-provider-key";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.VEROX_TRANSCRIPTS_BASE_URL;
    delete process.env.VEROX_TRANSCRIPTS_API_KEY;
  });

  it("returns ready provider transcript and maps transcript_orig", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          video_id: "abc123XYZ-_",
          status: "ready",
          transcript: "Hotový přepis z provideru.",
          transcript_orig: "Original transcript text.",
          transcript_at: "2026-06-12T10:00:00.000Z",
          source_lang: "en",
          char_count: 1234,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const result = await fetchVideoTranscriptServer("abc123XYZ-_");
    expect(result?.status).toBe("ready");
    expect(result?.transcript).toContain("provideru");
    expect(result?.transcript_original).toBe("Original transcript text.");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("maps queued provider status to processing", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          video_id: "abc123XYZ-_",
          status: "queued",
          transcript: null,
          transcript_at: null,
          transcript_orig: null,
          source_lang: null,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const result = await fetchVideoTranscriptServer("abc123XYZ-_");
    expect(result?.status).toBe("processing");
  });

  it("returns unavailable envelope when provider returns 404", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("not found", { status: 404 }),
    );

    const result = await fetchVideoTranscriptServer("abc123XYZ-_");
    expect(result).toEqual({
      video_id: "abc123XYZ-_",
      status: "unavailable",
      transcript: null,
      transcript_at: null,
      transcript_original: null,
      source_lang: null,
    });
  });

  it("throws config error when provider env vars are missing", async () => {
    delete process.env.VEROX_TRANSCRIPTS_BASE_URL;
    delete process.env.VEROX_TRANSCRIPTS_API_KEY;

    await expect(fetchVideoTranscriptServer("abc123XYZ-_")).rejects.toMatchObject<
      Partial<TranscriptProviderError>
    >({
      code: "provider_config_missing",
    });
  });

  it("throws auth error when provider returns 403", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("forbidden", { status: 403 }),
    );

    await expect(fetchVideoTranscriptServer("abc123XYZ-_")).rejects.toMatchObject<
      Partial<TranscriptProviderError>
    >({
      code: "provider_auth_failed",
      providerStatus: 403,
    });
  });
});
