import { describe, expect, it } from "vitest";

import { computeHorizontalCarouselScrollLeft } from "@/lib/horizontalCarouselScroll";

describe("computeHorizontalCarouselScrollLeft", () => {
  const maxLeft = 4100;
  const step = 700;

  it("scrolls toward the end before wrapping to start", () => {
    expect(
      computeHorizontalCarouselScrollLeft({
        currentLeft: 3600,
        maxLeft,
        step,
        direction: 1,
      }),
    ).toBe(4100);
  });

  it("wraps to start only when already at the end", () => {
    expect(
      computeHorizontalCarouselScrollLeft({
        currentLeft: maxLeft,
        maxLeft,
        step,
        direction: 1,
      }),
    ).toBe(0);
  });

  it("wraps to end only when already at the start", () => {
    expect(
      computeHorizontalCarouselScrollLeft({
        currentLeft: 0,
        maxLeft,
        step,
        direction: -1,
      }),
    ).toBe(maxLeft);
  });

  it("scrolls toward the start before wrapping to end", () => {
    expect(
      computeHorizontalCarouselScrollLeft({
        currentLeft: 900,
        maxLeft,
        step,
        direction: -1,
      }),
    ).toBe(200);
  });
});
