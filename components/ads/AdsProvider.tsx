"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { mergePreviewDemoUnits, parseAdsPayload, type AdPlacement, type AdUnit } from "@/lib/ads/types";

const AdsContext = createContext<AdUnit[]>([]);
const AdsReadyContext = createContext(false);

export function AdsProvider({ children }: { children: ReactNode }) {
  const [units, setUnits] = useState<AdUnit[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/ads", { cache: "no-store" });
        const payload = (await res.json()) as unknown;
        if (!cancelled) setUnits(mergePreviewDemoUnits(parseAdsPayload(payload)));
      } catch {
        if (!cancelled) setUnits(mergePreviewDemoUnits([]));
      } finally {
        if (!cancelled) setReady(true);
      }
    };
    void load();
    const id = window.setInterval(load, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  return (
    <AdsReadyContext.Provider value={ready}>
      <AdsContext.Provider value={units}>{children}</AdsContext.Provider>
    </AdsReadyContext.Provider>
  );
}

export function useAds(): AdUnit[] {
  return useContext(AdsContext);
}

export function useAdsReady(): boolean {
  return useContext(AdsReadyContext);
}

export function useAdForPlacement(placement: AdPlacement): AdUnit | null {
  return useAds().find((unit) => unit.placement === placement) ?? null;
}
