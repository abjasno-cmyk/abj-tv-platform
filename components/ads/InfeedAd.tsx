"use client";

import { useAds } from "@/components/ads/AdsProvider";
import { AdPicture, adLabel } from "@/components/ads/AdCreative";
import { pickInfeedUnit, type AdPlacement } from "@/lib/ads/types";

type InfeedAdProps = {
  placement: AdPlacement;
  /** Pořadí položky nad reklamou (0 = za první). Bez hodnoty = vždy, jednou v sekci. */
  afterIndex?: number;
  variant?: "wide" | "tile";
  as?: "aside" | "li";
};

export function InfeedAd({ placement, afterIndex, variant = "wide", as = "aside" }: InfeedAdProps) {
  const units = useAds();
  const unit =
    afterIndex === undefined
      ? (units.find((row) => row.placement === placement) ?? null)
      : pickInfeedUnit(units, placement, afterIndex);
  if (!unit) return null;
  const className = variant === "tile" ? "vx-ad-tile" : "vx-ad-infeed";
  const inner = (
    <>
      <p className="vx-ad-label">{adLabel(unit)}</p>
      {unit.headline && variant !== "tile" ? <p className="vx-ad-infeed-head">{unit.headline}</p> : null}
      <AdPicture unit={unit} />
    </>
  );
  if (as === "li") {
    return (
      <li className={`${className} vx-ad-listitem`} aria-label={adLabel(unit)}>
        {inner}
      </li>
    );
  }
  return (
    <aside className={className} aria-label={adLabel(unit)}>
      {inner}
    </aside>
  );
}
