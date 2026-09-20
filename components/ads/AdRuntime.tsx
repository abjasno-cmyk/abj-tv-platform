"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useAds } from "@/components/ads/AdsProvider";
import { AdPicture, adLabel } from "@/components/ads/AdCreative";
import "./ads.css";
import { bumpSessionShown, canShowThisSession, isAdPreview, type AdUnit } from "@/lib/ads/types";

const dismissedOverlayIds = new Set<string>();

type OverlayKind = "gate" | "popup";

function Overlay({
  unit,
  kind,
  onClose,
}: {
  unit: AdUnit;
  kind: OverlayKind;
  onClose: () => void;
}) {
  const [canSkip, setCanSkip] = useState(unit.skip_after_sec <= 0);
  const [soundOn, setSoundOn] = useState(false);
  useEffect(() => {
    if (unit.skip_after_sec <= 0) return;
    const t = window.setTimeout(() => setCanSkip(true), unit.skip_after_sec * 1000);
    return () => window.clearTimeout(t);
  }, [unit.id, unit.skip_after_sec]);

  const origin =
    typeof window !== "undefined" ? `&origin=${encodeURIComponent(window.location.origin)}` : "";
  const ytSrc = unit.video_id
    ? `https://www.youtube.com/embed/${encodeURIComponent(unit.video_id)}?autoplay=1&mute=${soundOn ? 0 : 1}&rel=0&playsinline=1&modestbranding=1&enablejsapi=1${origin}`
    : null;

  return (
    <div className={`vx-ad-overlay vx-ad-overlay--${kind}`} role="dialog" aria-modal="true" aria-label={adLabel(unit)}>
      <div className="vx-ad-dialog">
        <p className="vx-ad-label">{adLabel(unit)}</p>
        {unit.headline ? <h2>{unit.headline}</h2> : null}
        {unit.body ? <p>{unit.body}</p> : null}
        {ytSrc ? (
          <>
            <iframe
              title={unit.title}
              src={ytSrc}
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
            {!soundOn ? (
              <button type="button" className="vx-ad-sound" onClick={() => setSoundOn(true)}>
                Zapnout zvuk
              </button>
            ) : null}
          </>
        ) : (
          <AdPicture unit={unit} />
        )}
        <div className="vx-ad-actions">
          {unit.click_url ? (
            <a href={unit.click_url} target="_blank" rel="noopener noreferrer sponsored">
              Více informací
            </a>
          ) : null}
          <button type="button" onClick={onClose} disabled={!canSkip}>
            {canSkip ? "Pokračovat" : `Za ${unit.skip_after_sec} s`}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdRuntime() {
  const units = useAds();
  const [overlay, setOverlay] = useState<{ unit: AdUnit; kind: OverlayKind } | null>(null);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    setPreview(isAdPreview());
  }, []);

  const firstOf = useCallback(
    (placement: AdUnit["placement"]) => units.find((u) => u.placement === placement && canShowThisSession(u)) ?? null,
    [units],
  );

  useEffect(() => {
    if (overlay) return;
    const unit = firstOf("gate") ?? firstOf("popup");
    if (!unit || dismissedOverlayIds.has(unit.id)) return;
    setOverlay({ unit, kind: unit.placement === "gate" ? "gate" : "popup" });
  }, [firstOf, overlay]);

  const closeOverlay = useCallback(() => {
    if (overlay) {
      dismissedOverlayIds.add(overlay.unit.id);
      bumpSessionShown(overlay.unit.id);
    }
    setOverlay(null);
  }, [overlay]);

  const top = useMemo(() => units.find((u) => u.placement === "banner_top"), [units]);
  const bottom = useMemo(() => units.find((u) => u.placement === "banner_bottom"), [units]);

  return (
    <>
      {preview ? (
        <p className="vx-ad-preview-banner">
          Zkušební režim reklam (?reklama=1) — brána a video se ukážou i bez zapnuté kampaně.
        </p>
      ) : null}
      {top ? (
        <aside className="vx-ad-banner vx-ad-banner--top">
          <div className="vx-ad-label">{adLabel(top)}</div>
          <AdPicture unit={top} />
        </aside>
      ) : null}
      {bottom ? (
        <aside className="vx-ad-banner vx-ad-banner--bottom">
          <div className="vx-ad-label">{adLabel(bottom)}</div>
          <AdPicture unit={bottom} />
        </aside>
      ) : null}
      {overlay ? (
        <Overlay unit={overlay.unit} kind={overlay.kind} onClose={closeOverlay} />
      ) : null}
    </>
  );
}
