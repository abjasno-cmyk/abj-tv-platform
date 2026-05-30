"use client";

import { useEffect, useState } from "react";

const DAYS = ["NEDĚLE", "PONDĚLÍ", "ÚTERÝ", "STŘEDA", "ČTVRTEK", "PÁTEK", "SOBOTA"];
const MONTHS = [
  "ledna", "února", "března", "dubna", "května", "června",
  "července", "srpna", "září", "října", "listopadu", "prosince",
];

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

type LiveClockProps = { size?: "sm" | "lg"; showDate?: boolean };

export function LiveClock({ size = "lg", showDate = true }: LiveClockProps) {
  // Lazy initial value → first render already has a time (no synchronous
  // set-state-in-effect). The interval only handles subsequent ticks.
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const clockSize = size === "lg" ? "clamp(1.7rem, 3vw, 2.4rem)" : "1.15rem";
  const hh = pad(now.getHours());
  const mm = pad(now.getMinutes());
  const dateLabel = `${DAYS[now.getDay()]} ${now.getDate()}. ${MONTHS[now.getMonth()]} ${now.getFullYear()}`;

  // Decorative broadcast chrome — hidden from assistive tech (it would otherwise
  // read "23 : 58" as separate tokens and the live HTML differs from the client).
  return (
    <div className="flex flex-col items-end leading-none" aria-hidden="true">
      {showDate ? (
        <span className="vx-meta" style={{ fontSize: "0.6rem", letterSpacing: "0.16em" }} suppressHydrationWarning>
          {dateLabel}
        </span>
      ) : null}
      <span className="vx-clock" style={{ fontSize: clockSize, marginTop: 4 }} suppressHydrationWarning>
        {hh}
        <span className="vx-colon">:</span>
        {mm}
      </span>
    </div>
  );
}
