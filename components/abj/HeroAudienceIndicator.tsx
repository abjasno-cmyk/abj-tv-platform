"use client";

import { useEffect, useState } from "react";

import { formatAudienceLine, type AudienceSnapshot } from "@/lib/live/audience";

const POLL_MS = 15_000;

export function HeroAudienceIndicator() {
  const [snapshot, setSnapshot] = useState<AudienceSnapshot | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch("/api/live/presence", { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as {
          displayedViewers?: number;
          activeViewers?: number;
          displayBoost?: number;
        };
        if (cancelled) return;
        if (
          typeof payload.displayedViewers === "number" &&
          typeof payload.activeViewers === "number"
        ) {
          const displayBoost =
            typeof payload.displayBoost === "number"
              ? payload.displayBoost
              : payload.displayedViewers - payload.activeViewers;
          setSnapshot({
            activeViewers: payload.activeViewers,
            displayedViewers: payload.displayedViewers,
            displayBoost,
          });
        }
      } catch {
        // Ignore — indicator stays hidden until data loads.
      }
    };

    void load();
    const interval = window.setInterval(() => void load(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  if (!snapshot) return null;

  return (
    <p className="hf-audience" aria-live="polite">
      {formatAudienceLine(snapshot)}
    </p>
  );
}
