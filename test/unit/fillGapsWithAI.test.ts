import { describe, it, expect } from "vitest";
import { fillGapsWithAI } from "@/lib/programEngine";
import type { ProgramBlock } from "@/lib/epg-types";

function block(over: Partial<ProgramBlock> & Pick<ProgramBlock, "id" | "start" | "end">): ProgramBlock {
  return {
    durationMin: 30,
    type: "recorded",
    title: over.id,
    channel: "VEROX",
    isABJ: false,
    priority: 1,
    ...over,
  } as ProgramBlock;
}

describe("fillGapsWithAI", () => {
  it("returns the timeline unchanged when it has fewer than two blocks", () => {
    const single = [block({ id: "a", start: "2026-06-03T10:00:00Z", end: "2026-06-03T10:30:00Z" })];
    expect(fillGapsWithAI(single, [])).toBe(single);
    expect(fillGapsWithAI([], [])).toEqual([]);
  });

  it("preserves all original blocks and returns them sorted by start", () => {
    const timeline = [
      block({ id: "later", start: "2026-06-03T12:00:00Z", end: "2026-06-03T12:30:00Z" }),
      block({ id: "earlier", start: "2026-06-03T10:00:00Z", end: "2026-06-03T10:30:00Z" }),
    ];
    const result = fillGapsWithAI(timeline, []);
    const ids = result.map((b) => b.id);
    expect(ids).toContain("earlier");
    expect(ids).toContain("later");
    // Sorted ascending by start time.
    const starts = result.map((b) => new Date(b.start).getTime());
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
  });

  it("does not produce blocks with duplicate videoIds", () => {
    const timeline = [
      block({ id: "a", start: "2026-06-03T10:00:00Z", end: "2026-06-03T10:30:00Z", videoId: "vid-a" }),
      block({ id: "b", start: "2026-06-03T14:00:00Z", end: "2026-06-03T14:30:00Z", videoId: "vid-b" }),
    ];
    const result = fillGapsWithAI(timeline, []);
    const videoIds = result.map((b) => b.videoId).filter(Boolean);
    expect(new Set(videoIds).size).toBe(videoIds.length);
  });
});
