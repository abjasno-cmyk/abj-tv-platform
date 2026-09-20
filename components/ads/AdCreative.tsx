"use client";

import type { AdUnit } from "@/lib/ads/types";

export function adLabel(unit: AdUnit): string {
  return unit.advertiser ? `Reklama · ${unit.advertiser}` : "Reklama";
}

export function AdPicture({ unit }: { unit: AdUnit }) {
  const desktop = unit.image_desktop || unit.image_tablet || unit.image_mobile;
  if (!desktop) return null;
  const img = (
    <picture>
      {unit.image_mobile ? <source media="(max-width: 599px)" srcSet={unit.image_mobile} /> : null}
      {unit.image_tablet ? <source media="(max-width: 1023px)" srcSet={unit.image_tablet} /> : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={desktop} alt={unit.headline || unit.title} />
    </picture>
  );
  if (unit.click_url) {
    return (
      <a href={unit.click_url} target="_blank" rel="noopener noreferrer sponsored">
        {img}
      </a>
    );
  }
  return img;
}
