"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PROGRAM } from "../data";
import { ChevronLeft, ChevronRight } from "./icons";

export function ProgramCarousel() {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const sync = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 2);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    sync();
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    return () => {
      el.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, [sync]);

  const nudge = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.min(el.clientWidth * 0.8, 560), behavior: "smooth" });
  };

  return (
    <section id="program" className="vx-shell mt-20">
      <div className="flex items-center justify-center gap-4">
        <hr className="vx-rule-soft hidden flex-1 sm:block" />
        <h2 className="vx-display text-center text-verox-orangeText" style={{ fontSize: "clamp(1.4rem, 2.6vw, 2.1rem)" }}>
          Dnešní program
        </h2>
        <hr className="vx-rule-soft hidden flex-1 sm:block" />
      </div>

      <div className="mt-7 flex items-stretch gap-3 lg:gap-5">
        <button
          type="button"
          className="vx-chev hidden self-center sm:inline-flex"
          style={{ width: 54, height: 54 }}
          onClick={() => nudge(-1)}
          disabled={atStart}
          aria-label="Předchozí pořady"
        >
          <ChevronLeft size={24} />
        </button>

        <div ref={trackRef} className="vx-scroller min-w-0 flex-1">
          {PROGRAM.map((p) => (
            <article key={`${p.time}-${p.title}`} className="vx-card vx-card-hover flex flex-col justify-between p-5">
              <div className="flex items-center justify-between">
                <span className="vx-clock" style={{ fontSize: "1.5rem", color: "var(--vx-ink)" }}>
                  {p.time}
                </span>
                {p.live ? (
                  <span className="vx-badge">
                    <span className="vx-live-dot" style={{ background: "#fff" }} /> Živě
                  </span>
                ) : (
                  <span className="vx-kicker">{p.tag}</span>
                )}
              </div>
              <h3 className="vx-display mt-8 text-verox-ink" style={{ fontSize: "1.3rem", lineHeight: 1.02 }}>
                {p.title}
              </h3>
              <div className="mt-4 flex items-center justify-between">
                <span className="vx-meta">{p.live ? p.tag : "Záznam i živě"}</span>
                <span className="h-2 w-2 rounded-full bg-verox-orange" aria-hidden="true" />
              </div>
            </article>
          ))}
        </div>

        <button
          type="button"
          className="vx-chev hidden self-center sm:inline-flex"
          style={{ width: 54, height: 54 }}
          onClick={() => nudge(1)}
          disabled={atEnd}
          aria-label="Další pořady"
        >
          <ChevronRight size={24} />
        </button>
      </div>
    </section>
  );
}
