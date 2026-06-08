import { describe, expect, it } from "vitest";

import { isPlayablePlayoutBlock, isValidYouTubeVideoId, readPlayoutVideoId } from "@/lib/playout/types";

function block(overrides: Partial<{ video_id: string | null }> = {}) {
  return {
    block_id: "b1",
    starts_at: "2026-06-08T10:00:00.000Z",
    ends_at: "2026-06-08T10:30:00.000Z",
    video_id: "dQw4w9WgXcQ",
    ...overrides,
  };
}

describe("playout block video id helpers", () => {
  it("accepts valid youtube ids", () => {
    expect(isValidYouTubeVideoId("dQw4w9WgXcQ")).toBe(true);
    expect(readPlayoutVideoId(block())).toBe("dQw4w9WgXcQ");
    expect(isPlayablePlayoutBlock(block())).toBe(true);
  });

  it("rejects empty, null, and malformed ids", () => {
    expect(isValidYouTubeVideoId("")).toBe(false);
    expect(isValidYouTubeVideoId(null)).toBe(false);
    expect(readPlayoutVideoId(block({ video_id: "" }))).toBeNull();
    expect(readPlayoutVideoId(block({ video_id: null as unknown as string }))).toBeNull();
    expect(isPlayablePlayoutBlock(block({ video_id: "short" }))).toBe(false);
    expect(isPlayablePlayoutBlock(null)).toBe(false);
  });
});
