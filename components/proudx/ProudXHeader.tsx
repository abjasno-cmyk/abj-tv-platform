"use client";

import { useEffect, useState } from "react";

function formatClock(d: Date): string {
  return new Intl.DateTimeFormat("cs-CZ", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Prague",
  }).format(d);
}

export function ProudXHeader({ active }: { active: "live" | "videa" }) {
  const [clock, setClock] = useState("");
  useEffect(() => {
    const tick = () => setClock(formatClock(new Date()));
    tick();
    const id = window.setInterval(tick, 15_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <header className="px-top">
      <a className="px-brand" href="/live" aria-label="ProudX">
        Proud<span>X</span>
      </a>
      <nav className="px-nav" aria-label="Navigace">
        <a className={active === "live" ? "is-active" : undefined} href="/live">Živě</a>
        <a className={active === "videa" ? "is-active" : undefined} href="/videa">Videa</a>
      </nav>
      <div className="px-status">
        <span className="px-livedot" aria-hidden="true" />
        <span className="px-status-label">Živě</span>
        <span className="px-clock" suppressHydrationWarning>{clock}</span>
      </div>
    </header>
  );
}
