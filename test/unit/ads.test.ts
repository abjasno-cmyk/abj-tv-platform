import { describe, expect, it, vi } from "vitest";

import {
  mergePreviewDemoUnits,
  parseAdsPayload,
  pickAdImage,
  pickInfeedUnit,
  rewriteAdAssetUrl,
  shouldInsertVideoAd,
  shouldShowInfeedAt,
  type AdUnit,
} from "@/lib/ads/types";

const sample: AdUnit = {
  id: "u1",
  title: "Kampaň",
  advertiser: "Zadavatel",
  placement: "banner_top",
  every_n_videos: 3,
  max_per_session: 1,
  skip_after_sec: 8,
  duration_sec: 15,
  cue_mode: "every_n",
  cue_text: null,
  image_desktop: "https://cdn.example.com/d.jpg",
  image_tablet: "https://cdn.example.com/t.jpg",
  image_mobile: "https://cdn.example.com/m.jpg",
  click_url: "https://example.com",
  video_id: null,
  headline: null,
  body: null,
};

describe("parseAdsPayload", () => {
  it("keeps only known placements", () => {
    const items = parseAdsPayload({
      items: [
        { ...sample, placement: "banner_top" },
        { ...sample, id: "bad", placement: "unknown" },
        { title: "no-id", placement: "popup" },
      ],
    });
    expect(items).toHaveLength(1);
    expect(items[0]?.id).toBe("u1");
  });

  it("accepts in-feed placements and uploaded media paths", () => {
    const items = parseAdsPayload({
      items: [
        {
          ...sample,
          id: "inf",
          placement: "infeed_channels_tile",
          image_desktop: "/ads/media/0123456789abcdef.png",
          cue_mode: "before_title",
          cue_text: "zprávy",
        },
      ],
    });
    expect(items).toHaveLength(1);
    expect(items[0]?.placement).toBe("infeed_channels_tile");
    expect(items[0]?.image_desktop).toBe("/api/ads/media/0123456789abcdef.png");
    expect(items[0]?.cue_mode).toBe("before_title");
  });
});

describe("rewriteAdAssetUrl", () => {
  it("maps engine media path to the site proxy", () => {
    expect(rewriteAdAssetUrl("/ads/media/0123456789abcdef.jpg")).toBe(
      "/api/ads/media/0123456789abcdef.jpg",
    );
  });
});

describe("pickAdImage", () => {
  it("picks mobile / tablet / desktop by width", () => {
    expect(pickAdImage(sample, 390)).toContain("/m.jpg");
    expect(pickAdImage(sample, 800)).toContain("/t.jpg");
    expect(pickAdImage(sample, 1400)).toContain("/d.jpg");
  });

  it("falls back when a breakpoint image is missing", () => {
    const unit = { ...sample, image_mobile: null, image_tablet: null };
    expect(pickAdImage(unit, 360)).toContain("/d.jpg");
  });
});

describe("shouldInsertVideoAd", () => {
  it("matches a program title cue", () => {
    const unit: AdUnit = {
      ...sample,
      placement: "between_videos",
      cue_mode: "before_title",
      cue_text: "zprávy",
    };
    expect(shouldInsertVideoAd(unit, "before", "Večerní zprávy", 0)).toBe(true);
    expect(shouldInsertVideoAd(unit, "before", "Sport", 0)).toBe(false);
    expect(shouldInsertVideoAd(unit, "between", "Večerní zprávy", 1)).toBe(false);
  });

  it("inserts every N switches between blocks", () => {
    const unit: AdUnit = { ...sample, placement: "between_videos", cue_mode: "every_n", every_n_videos: 2 };
    expect(shouldInsertVideoAd(unit, "before", "A", 0)).toBe(false);
    expect(shouldInsertVideoAd(unit, "between", "A", 1)).toBe(false);
    expect(shouldInsertVideoAd(unit, "between", "A", 2)).toBe(true);
  });
});

describe("preview mode", () => {
  function withPreview(run: () => void) {
    vi.stubGlobal("window", { location: { search: "?reklama=1" } });
    try {
      run();
    } finally {
      vi.unstubAllGlobals();
    }
  }

  it("plays every_n video ads at the start of the current block", () => {
    withPreview(() => {
      const unit: AdUnit = { ...sample, placement: "between_videos", cue_mode: "every_n", every_n_videos: 8 };
      expect(shouldInsertVideoAd(unit, "before", "Pořad", 0)).toBe(true);
    });
  });

  it("adds demo gate and video when those placements are missing", () => {
    withPreview(() => {
      const merged = mergePreviewDemoUnits([]);
      expect(merged.map((row) => row.placement)).toEqual(["gate", "between_videos"]);
    });
  });
});

describe("in-feed cadence", () => {
  it("shows after every Nth item", () => {
    expect(shouldShowInfeedAt(0, 3)).toBe(false);
    expect(shouldShowInfeedAt(2, 3)).toBe(true);
    expect(shouldShowInfeedAt(0, 1)).toBe(true);
  });

  it("rotates units of the same placement", () => {
    const a = { ...sample, id: "a", placement: "infeed_noviny" as const, every_n_videos: 2 };
    const b = { ...sample, id: "b", placement: "infeed_noviny" as const, every_n_videos: 2 };
    expect(pickInfeedUnit([a, b], "infeed_noviny", 1)?.id).toBe("a");
    expect(pickInfeedUnit([a, b], "infeed_noviny", 3)?.id).toBe("b");
    expect(pickInfeedUnit([a, b], "infeed_noviny", 0)).toBeNull();
  });
});
