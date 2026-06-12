import { describe, expect, it } from "vitest";

import { isTranscriptLabelVisible, parseTranscriptState } from "@/lib/transcriptTypes";

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

describe("isTranscriptLabelVisible", () => {
  it("shows the label only for ready and pending", () => {
    expect(isTranscriptLabelVisible("ready")).toBe(true);
    expect(isTranscriptLabelVisible("pending")).toBe(true);
    expect(isTranscriptLabelVisible("not_ready_live")).toBe(false);
    expect(isTranscriptLabelVisible("unavailable")).toBe(false);
    expect(isTranscriptLabelVisible(undefined)).toBe(false);
  });
});
