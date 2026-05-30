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

// Live broadcast clock for the global VEROX header. Decorative chrome, hidden
// from assistive tech (it would otherwise read the colon as a separate token).
export function HeaderClock({ showDate = true }: { showDate?: boolean }) {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const dateLabel = `${DAYS[now.getDay()]} ${now.getDate()}. ${MONTHS[now.getMonth()]} ${now.getFullYear()}`;

  return (
    <div className="flex flex-col items-end leading-none" aria-hidden="true">
      {showDate ? (
        <span
          className="vx-meta hidden sm:block"
          style={{ fontSize: "0.58rem", letterSpacing: "0.14em" }}
          suppressHydrationWarning
        >
          {dateLabel}
        </span>
      ) : null}
      <span className="vx-clock" style={{ fontSize: "1.15rem", marginTop: 3 }} suppressHydrationWarning>
        {pad(now.getHours())}
        <span className="vx-colon">:</span>
        {pad(now.getMinutes())}
      </span>
    </div>
  );
}
