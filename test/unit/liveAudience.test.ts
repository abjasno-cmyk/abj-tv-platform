import { afterEach, describe, expect, it } from "vitest";

import {
  VIEWER_BOOST_MAX,
  VIEWER_BOOST_MIN,
  buildAudienceSnapshot,
  czechViewerWord,
  formatAudienceLine,
  formatCzechAudienceNumber,
  isValidPresenceSessionId,
  resetViewerDisplayBoostCache,
  rollViewerDisplayBoost,
} from "@/lib/live/audience";

afterEach(() => {
  resetViewerDisplayBoostCache();
});

describe("rollViewerDisplayBoost", () => {
  it("returns integers in the configured inclusive range", () => {
    for (let i = 0; i < 200; i += 1) {
      const boost = rollViewerDisplayBoost();
      expect(boost).toBeGreaterThanOrEqual(VIEWER_BOOST_MIN);
      expect(boost).toBeLessThanOrEqual(VIEWER_BOOST_MAX);
      expect(Number.isInteger(boost)).toBe(true);
    }
  });
});

describe("buildAudienceSnapshot", () => {
  it("adds the display boost to active viewers", () => {
    expect(buildAudienceSnapshot(1154, 9500)).toEqual({
      activeViewers: 1154,
      displayBoost: 9500,
      displayedViewers: 1154 + 9500,
    });
  });
});

describe("formatAudienceLine", () => {
  it("formats Czech audience copy with thousands separator", () => {
    const line = formatAudienceLine(buildAudienceSnapshot(1154, 10_000));
    expect(line).toMatch(/Právě sleduje 11.154 diváků/);
  });
});

describe("czechViewerWord", () => {
  it("uses singular only for exactly one", () => {
    expect(czechViewerWord(1)).toBe("divák");
  });

  it("uses genitive plural for five or more", () => {
    expect(czechViewerWord(11_154)).toBe("diváků");
    expect(czechViewerWord(5)).toBe("diváků");
  });
});

describe("formatCzechAudienceNumber", () => {
  it("formats with cs-CZ grouping", () => {
    expect(formatCzechAudienceNumber(11154)).toMatch(/11.154/);
  });
});

describe("isValidPresenceSessionId", () => {
  it("accepts uuid-like ids", () => {
    expect(isValidPresenceSessionId("a1b2c3d4-e5f6-7890-abcd-ef1234567890")).toBe(true);
  });

  it("rejects short ids", () => {
    expect(isValidPresenceSessionId("short")).toBe(false);
  });
});
