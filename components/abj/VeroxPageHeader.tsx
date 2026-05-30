"use client";

import { useEffect, useState } from "react";

function getPragueTimeLabel(date: Date): string {
  return new Intl.DateTimeFormat("cs-CZ", {
    timeZone: "Europe/Prague",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function getPragueDateHeader(date: Date): string {
  const parts = new Intl.DateTimeFormat("cs-CZ", {
    timeZone: "Europe/Prague",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, part) => {
      if (part.type !== "literal") acc[part.type] = part.value;
      return acc;
    }, {});

  const weekday = (parts.weekday ?? "").toLocaleUpperCase("cs-CZ");
  const day = parts.day ?? "";
  const month = (parts.month ?? "").toLocaleUpperCase("cs-CZ");
  const year = parts.year ?? "";
  return `${weekday} ${day}.${month} ${year}`.replace(/\s+/g, " ").trim();
}

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
    <header className={`mb-2 flex flex-col items-end text-right ${className}`.trim()}>
      <p className="verox-font-myriad-bold text-[13px] uppercase leading-normal tracking-normal text-[#303030]">{dateLabel}</p>
      <p className="verox-videa-clock verox-font-myriad-bold leading-normal tracking-[0.025em] text-[#F37021]">{clockLabel}</p>
    </header>
  );
}
