import { describe, expect, it } from "vitest";

import {
  VIEWER_DISPLAY_BOOST,
  buildAudienceSnapshot,
  czechViewerWord,
  formatAudienceLine,
  formatCzechAudienceNumber,
  isValidPresenceSessionId,
} from "@/lib/live/audience";

describe("buildAudienceSnapshot", () => {
  it("adds the display boost to active viewers", () => {
    expect(buildAudienceSnapshot(1154)).toEqual({
      activeViewers: 1154,
      displayedViewers: 1154 + VIEWER_DISPLAY_BOOST,
    });
  });
});

describe("formatAudienceLine", () => {
  it("formats Czech audience copy with thousands separator", () => {
    const line = formatAudienceLine(buildAudienceSnapshot(1154));
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
