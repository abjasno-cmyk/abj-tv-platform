"use client";

// Veřejný odpočet do launche ProudX. Cíl čte z NEXT_PUBLIC_LAUNCH_AT (inline
// při buildu). V T-0 reload — proxy brána už pustí ostrý web. Fixed overlay
// překrývá i globální patičku.

import { useEffect, useState } from "react";

import "@/app/live/proudx-live.css";

const LAUNCH_AT = Date.parse(process.env.NEXT_PUBLIC_LAUNCH_AT ?? "");

function pad(n: number): string {
  return String(Math.max(0, n)).padStart(2, "0");
}

export function LaunchCountdown() {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  const remaining = Number.isFinite(LAUNCH_AT) ? LAUNCH_AT - now : 0;

  useEffect(() => {
    if (remaining <= 0) {
      // Malý náhodný rozptyl, ať se všichni čekající nenavalí v tutéž ms.
      const t = window.setTimeout(() => window.location.replace("/live"), 400 + Math.random() * 1200);
      return () => window.clearTimeout(t);
    }
  }, [remaining <= 0]);

  const totalS = Math.max(0, Math.floor(remaining / 1000));
  const h = Math.floor(totalS / 3600);
  const m = Math.floor((totalS % 3600) / 60);
  const s = totalS % 60;

  return (
    <div
      className="px"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "grid",
        placeItems: "center",
        textAlign: "center",
        padding: "24px",
      }}
    >
      <div className="px-bgglow" aria-hidden="true" style={{ zIndex: -1 }} />
      <div>
        <p
          style={{
            fontFamily: "var(--serif)",
            fontSize: "clamp(44px, 8vw, 84px)",
            lineHeight: 1,
            color: "var(--ink)",
            margin: 0,
          }}
        >
          Proud<span style={{ color: "var(--accent)" }}>X</span>
        </p>
        <p
          style={{
            margin: "18px 0 40px",
            fontSize: "clamp(12px, 1.6vw, 15px)",
            fontWeight: 600,
            letterSpacing: "0.42em",
            textTransform: "uppercase",
            color: "var(--muted)",
          }}
        >
          Zůstaňte v proudu
        </p>
        <p
          suppressHydrationWarning
          style={{
            fontFamily: "var(--sans)",
            fontVariantNumeric: "tabular-nums",
            fontSize: "clamp(56px, 12vw, 128px)",
            fontWeight: 700,
            lineHeight: 1,
            color: "var(--ink)",
            margin: 0,
            letterSpacing: "0.04em",
          }}
        >
          {remaining <= 0 ? "JDEME ŽÍT" : `${pad(h)}:${pad(m)}:${pad(s)}`}
        </p>
        <p style={{ marginTop: "28px", fontSize: "clamp(14px, 1.8vw, 17px)", color: "var(--muted)" }}>
          {remaining <= 0
            ? "Spouštíme… vteřinku."
            : "Nová internetová televize startuje dnes v 15:00."}
        </p>
      </div>
    </div>
  );
}
