import { describe, expect, it } from "vitest";

import {
  isTranscriptLabelVisible,
  parseTranscriptResponse,
  parseTranscriptState,
} from "@/lib/transcriptTypes";

describe("parseTranscriptState", () => {
  it("accepts known transcript states", () => {
    expect(parseTranscriptState("ready")).toBe("ready");
    expect(parseTranscriptState(" pending ")).toBe("pending");
    expect(parseTranscriptState("not_ready_live")).toBe("not_ready_live");
    expect(parseTranscriptState("unavailable")).toBe("unavailable");
  });

  it("rejects unknown values", () => {
    expect(parseTranscriptState("processing")).toBeUndefined();
    expect(parseTranscriptState(null)).toBeUndefined();
    expect(parseTranscriptState(1)).toBeUndefined();
  });
});

describe("parseTranscriptResponse", () => {
  it("parses a valid transcript payload", () => {
    expect(
      parseTranscriptResponse({
        video_id: "lsg3k-Wh9vU",
        status: "processing",
        transcript: null,
        transcript_at: null,
      }),
    ).toEqual({
      video_id: "lsg3k-Wh9vU",
      status: "processing",
      transcript: null,
      transcript_at: null,
    });
  });

  it("maps pending status to processing for polling", () => {
    expect(
      parseTranscriptResponse({
        video_id: "abc123",
        status: "pending",
        transcript: null,
        transcript_at: null,
      }),
    ).toEqual({
      video_id: "abc123",
      status: "processing",
      transcript: null,
      transcript_at: null,
    });
  });

  it("rejects invalid payloads", () => {
    expect(parseTranscriptResponse({ error: "x" })).toBeNull();
    expect(parseTranscriptResponse(null)).toBeNull();
  });
});

describe("isTranscriptLabelVisible", () => {
  it("hides the label only for not_ready_live and unavailable", () => {
    expect(isTranscriptLabelVisible("ready")).toBe(true);
    expect(isTranscriptLabelVisible("pending")).toBe(true);
    expect(isTranscriptLabelVisible(undefined)).toBe(true);
    expect(isTranscriptLabelVisible("not_ready_live")).toBe(false);
    expect(isTranscriptLabelVisible("unavailable")).toBe(false);
  });
});
