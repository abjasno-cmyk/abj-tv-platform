import { describe, it, expect } from "vitest";
import {
  getEditionTimestamp,
  toPragueDayKey,
  dayKeyToOrdinal,
  normalizeEditionTypeFilter,
  normalizeDateFilter,
  pragueDayRangeToUtc,
  getEditionTypeLabel,
  getCategoryLabel,
  sourceCountLabel,
  getItemSlug,
  getItemAnchorId,
  getItemSourceCount,
  normalizeConfidenceScore,
  confidencePercent,
  itemWordCount,
  itemReadMinutes,
  neuroFrameLabel,
  isCrossCheckConflict,
  isFollowup,
  hasCzBridge,
  type NewsEdition,
  type NewsItem,
  type NewsSource,
} from "@/lib/jasne-zpravy";

describe("getEditionTimestamp", () => {
  it("prefers published_at over generated_at", () => {
    expect(
      getEditionTimestamp({ published_at: "2026-06-03T10:00:00Z", generated_at: "2026-06-03T09:00:00Z" } as Pick<
        NewsEdition,
        "published_at" | "generated_at"
      >),
    ).toBe("2026-06-03T10:00:00Z");
  });
  it("falls back to generated_at when not published", () => {
    expect(
      getEditionTimestamp({ published_at: null, generated_at: "2026-06-03T09:00:00Z" } as Pick<
        NewsEdition,
        "published_at" | "generated_at"
      >),
    ).toBe("2026-06-03T09:00:00Z");
  });
});

describe("toPragueDayKey", () => {
  it("maps a late-UTC instant to the next Prague day (summer = UTC+2)", () => {
    expect(toPragueDayKey("2026-06-03T22:30:00.000Z")).toBe("2026-06-04");
  });
  it("returns empty string for invalid input", () => {
    expect(toPragueDayKey("nope")).toBe("");
    expect(toPragueDayKey(null)).toBe("");
  });
});

describe("dayKeyToOrdinal", () => {
  it("converts a YYYY-MM-DD key to a UTC day ordinal", () => {
    expect(dayKeyToOrdinal("2026-06-03")).toBe(Math.floor(Date.UTC(2026, 5, 3) / 86_400_000));
  });
  it("returns null for malformed keys", () => {
    expect(dayKeyToOrdinal("2026/06/03")).toBeNull();
    expect(dayKeyToOrdinal("garbage")).toBeNull();
  });
  it("is consecutive across adjacent days", () => {
    expect(dayKeyToOrdinal("2026-06-04")! - dayKeyToOrdinal("2026-06-03")!).toBe(1);
  });
});

describe("normalizeEditionTypeFilter", () => {
  it("accepts known filters and the first array element", () => {
    expect(normalizeEditionTypeFilter("morning")).toBe("morning");
    expect(normalizeEditionTypeFilter(["evening", "morning"])).toBe("evening");
  });
  it("rejects unknown values", () => {
    expect(normalizeEditionTypeFilter("bogus")).toBeNull();
    expect(normalizeEditionTypeFilter(undefined)).toBeNull();
  });
});

describe("normalizeDateFilter", () => {
  it("passes a valid calendar date", () => {
    expect(normalizeDateFilter("2026-06-03")).toBe("2026-06-03");
  });
  it("rejects impossible or malformed dates", () => {
    expect(normalizeDateFilter("2026-13-40")).toBeNull();
    expect(normalizeDateFilter("2026-02-30")).toBeNull();
    expect(normalizeDateFilter("3.6.2026")).toBeNull();
  });
});

describe("pragueDayRangeToUtc", () => {
  it("returns the UTC bounds of a Prague calendar day (summer = UTC+2)", () => {
    expect(pragueDayRangeToUtc("2026-06-03")).toEqual({
      startIso: "2026-06-02T22:00:00.000Z",
      endIso: "2026-06-03T22:00:00.000Z",
    });
  });
});

describe("label helpers", () => {
  it("getEditionTypeLabel falls back sensibly", () => {
    expect(getEditionTypeLabel(null)).toBe("Vydání");
    expect(getEditionTypeLabel("nonexistent-type")).toBe("nonexistent-type");
  });
  it("getCategoryLabel falls back sensibly", () => {
    expect(getCategoryLabel(null)).toBe("Další");
    expect(getCategoryLabel("nonexistent-cat")).toBe("nonexistent-cat");
  });
  it("sourceCountLabel pluralizes Czech correctly", () => {
    expect(sourceCountLabel(1)).toBe("1 zdroj");
    expect(sourceCountLabel(2)).toBe("2 zdroje");
    expect(sourceCountLabel(4)).toBe("4 zdroje");
    expect(sourceCountLabel(5)).toBe("5 zdrojů");
    expect(sourceCountLabel(0)).toBe("0 zdrojů");
  });
});

describe("slug / anchor helpers", () => {
  it("getItemSlug uses slug when present, else id", () => {
    expect(getItemSlug({ slug: "moje-zprava", id: "uuid-1" } as Pick<NewsItem, "slug" | "id">)).toBe("moje-zprava");
    expect(getItemSlug({ slug: "  ", id: "uuid-1" } as Pick<NewsItem, "slug" | "id">)).toBe("uuid-1");
  });
  it("getItemAnchorId replaces unsafe chars with dashes", () => {
    expect(getItemAnchorId({ slug: "a/b c", id: "x" } as Pick<NewsItem, "slug" | "id">)).toBe("a-b-c");
  });
});

describe("getItemSourceCount", () => {
  it("prefers the mapped source list length, else source_count, else 0", () => {
    const sources = new Map<string, NewsSource[]>([["id1", [{} as NewsSource, {} as NewsSource]]]);
    expect(getItemSourceCount({ id: "id1", source_count: 0 } as Pick<NewsItem, "source_count" | "id">, sources)).toBe(2);
    expect(getItemSourceCount({ id: "id2", source_count: 5 } as Pick<NewsItem, "source_count" | "id">, sources)).toBe(5);
    expect(getItemSourceCount({ id: "id3", source_count: 0 } as Pick<NewsItem, "source_count" | "id">)).toBe(0);
  });
});

describe("confidence helpers", () => {
  it("normalizes 0..1 and 0..100 scores, clamps, and rejects non-numbers", () => {
    expect(normalizeConfidenceScore(0.5)).toBe(0.5);
    expect(normalizeConfidenceScore(85)).toBeCloseTo(0.85, 5);
    expect(normalizeConfidenceScore(150)).toBe(1);
    expect(normalizeConfidenceScore(-5)).toBe(0);
    expect(normalizeConfidenceScore(null)).toBeNull();
    expect(normalizeConfidenceScore(Number.NaN)).toBeNull();
  });
  it("confidencePercent rounds to whole percent", () => {
    expect(confidencePercent(0.857)).toBe(86);
    expect(confidencePercent(85)).toBe(85);
    expect(confidencePercent(null)).toBe(0);
  });
});

describe("word count / read time", () => {
  const item = (over: Partial<NewsItem>) =>
    ({ headline: null, short_headline: null, lead: null, body: null, ...over } as Pick<
      NewsItem,
      "headline" | "short_headline" | "lead" | "body" | "metadata"
    >);

  it("uses metadata.word_count when valid", () => {
    expect(itemWordCount(item({ metadata: { word_count: 440 } as NewsItem["metadata"] }))).toBe(440);
  });
  it("counts words across fields otherwise", () => {
    expect(itemWordCount(item({ headline: "jedna dva", lead: "tri ctyri pet" }))).toBe(5);
  });
  it("read time is at least 1 minute and ~220 wpm", () => {
    expect(itemReadMinutes(item({ metadata: { word_count: 0 } as NewsItem["metadata"] }))).toBe(1);
    expect(itemReadMinutes(item({ metadata: { word_count: 441 } as NewsItem["metadata"] }))).toBe(3);
  });
});

describe("metadata flags", () => {
  it("neuroFrameLabel maps known frames and falls back", () => {
    expect(neuroFrameLabel("consequence")).toBe("Dopad");
    expect(neuroFrameLabel("paradox")).toBe("Paradox");
    expect(neuroFrameLabel(null)).toBe("Neurčeno");
    expect(neuroFrameLabel("weird")).toBe("weird");
  });
  it("isCrossCheckConflict detects risk flag or metadata conflicts", () => {
    expect(isCrossCheckConflict({ risk_flags: { cross_check_conflict: true }, metadata: {} } as Pick<NewsItem, "risk_flags" | "metadata">)).toBe(true);
    expect(isCrossCheckConflict({ risk_flags: {}, metadata: { cross_check_conflicts: ["x"] } } as Pick<NewsItem, "risk_flags" | "metadata">)).toBe(true);
    expect(isCrossCheckConflict({ risk_flags: {}, metadata: {} } as Pick<NewsItem, "risk_flags" | "metadata">)).toBe(false);
  });
  it("isFollowup / hasCzBridge read metadata", () => {
    expect(isFollowup({ metadata: { is_followup: true } } as Pick<NewsItem, "metadata">)).toBe(true);
    expect(isFollowup({ metadata: {} } as Pick<NewsItem, "metadata">)).toBe(false);
    expect(hasCzBridge({ metadata: { cz_bridge: "kontext" } } as Pick<NewsItem, "metadata">)).toBe(true);
    expect(hasCzBridge({ metadata: { cz_bridge: "   " } } as Pick<NewsItem, "metadata">)).toBe(false);
  });
});
