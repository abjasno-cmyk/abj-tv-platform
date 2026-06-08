import { describe, expect, it } from "vitest";

import type { ProgramBlock } from "@/lib/epg-types";
import { pickLiveAlertBlock, shouldShowLiveAlert, toLiveAlertCandidate } from "@/lib/liveAlert";

function block(overrides: Partial<ProgramBlock> & Pick<ProgramBlock, "id" | "videoId">): ProgramBlock {
  return {
    start: "2026-06-07T18:00:00.000Z",
    end: "2026-06-07T20:00:00.000Z",
    durationMin: 120,
    type: "live",
    title: "Test",
    channel: "Test Channel",
    isABJ: false,
    priority: 1150,
    ...overrides,
  };
}

describe("pickLiveAlertBlock", () => {
  const now = new Date("2026-06-07T19:00:00.000Z");

  it("returns only active ABJ live blocks", () => {
    const timeline = [
      block({
        id: "vajicko",
        videoId: "vajicko-live",
        title: "Dr. Vajíčko",
        channel: "Doktor Vajíčko",
        isABJ: false,
        priority: 1250,
      }),
      block({
        id: "sedmicka",
        videoId: "sedmicka-live",
        title: "Sedmička Jany Bobošíkové",
        channel: "ABJ TV",
        isABJ: true,
        priority: 1200,
      }),
    ];

    expect(pickLiveAlertBlock(timeline, now)?.videoId).toBe("sedmicka-live");
  });

  it("ignores premieres and non-live blocks", () => {
    const timeline = [
      block({
        id: "premiere",
        videoId: "premiere-id",
        type: "premiere",
        isABJ: true,
      }),
      block({
        id: "vod",
        videoId: "vod-id",
        type: "recorded",
        isABJ: true,
      }),
    ];

    expect(pickLiveAlertBlock(timeline, now)).toBeNull();
  });
});

describe("shouldShowLiveAlert", () => {
  const abjLive = toLiveAlertCandidate(
    block({
      id: "sedmicka",
      videoId: "sedmicka-live",
      title: "Sedmička",
      channel: "ABJ TV",
      isABJ: true,
    }),
  );

  it("shows alert for ABJ live when user watches something else", () => {
    expect(shouldShowLiveAlert(abjLive, "other-video", new Set())).toBe(true);
  });

  it("hides alert when user already watches the same ABJ live", () => {
    expect(shouldShowLiveAlert(abjLive, "sedmicka-live", new Set())).toBe(false);
  });

  it("hides alert for dismissed ABJ live", () => {
    expect(shouldShowLiveAlert(abjLive, "other-video", new Set(["sedmicka-live"]))).toBe(false);
  });

  it("hides alert for non-ABJ live", () => {
    const nonAbj = { ...abjLive, is_abj: false, video_id: "vajicko-live" };
    expect(shouldShowLiveAlert(nonAbj, "other-video", new Set())).toBe(false);
  });
});
