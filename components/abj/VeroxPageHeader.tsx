"use client";

import { useEffect, useState } from "react";

import { getPragueDateHeader, getPragueTimeLabel } from "@/components/abj/verox-header-utils";

export function VeroxPageHeader({ className = "" }: { className?: string }) {
  const [clockLabel, setClockLabel] = useState(() => getPragueTimeLabel(new Date()));
  const [dateLabel, setDateLabel] = useState(() => getPragueDateHeader(new Date()));

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClockLabel(getPragueTimeLabel(now));
      setDateLabel(getPragueDateHeader(now));
    };
    tick();
    const timer = window.setInterval(tick, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <header
      className={`verox-page-inline-header verox-live-page-header flex flex-col items-end text-right ${className}`.trim()}
    >
      <p className="verox-live-date verox-font-myriad-bold uppercase leading-normal tracking-normal text-[#303030]">{dateLabel}</p>
      <p className="verox-live-clock verox-font-myriad-bold leading-normal tracking-[0.025em] text-[#F37021]">{clockLabel}</p>
    </header>
  );
}
