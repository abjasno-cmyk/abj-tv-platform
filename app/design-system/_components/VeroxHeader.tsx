"use client";

import { useState } from "react";
import { NAV_ITEMS } from "../data";
import { Wordmark } from "./Wordmark";
import { LiveClock } from "./LiveClock";

export function VeroxHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 vx-rise" data-delay="1">
      <div className="bg-[rgba(251,248,242,0.9)] backdrop-blur-md border-b-2 border-verox-orange">
        <div className="vx-shell">
          {/* Tier 1 — wordmark + live clock */}
          <div className="flex items-center gap-4 pt-3.5 pb-2">
            <a href="#zive" className="shrink-0">
              <Wordmark size="md" />
            </a>
            <div className="ml-auto flex items-center gap-4 sm:gap-6">
              <span className="hidden items-center gap-2 sm:inline-flex">
                <span className="vx-live-dot" />
                <span
                  className="text-verox-orangeText"
                  style={{ fontFamily: "var(--vx-mono)", fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.18em" }}
                >
                  ŽIVĚ
                </span>
              </span>
              <LiveClock size="sm" />
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="lg:hidden grid h-9 w-9 place-items-center text-verox-ink"
                aria-label={open ? "Zavřít menu" : "Otevřít menu"}
                aria-expanded={open}
              >
                <span className="text-2xl leading-none">{open ? "×" : "≡"}</span>
              </button>
            </div>
          </div>

          {/* Tier 2 — primary navigation + CTA */}
          <div className="hidden items-center gap-8 pb-2.5 lg:flex">
            <nav>
              <ul className="flex items-center gap-8">
                {NAV_ITEMS.map((item) => (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      aria-current={item.active ? "page" : undefined}
                      className={`text-[0.8rem] font-semibold uppercase tracking-[0.14em] transition-colors ${
                        item.active
                          ? "text-verox-orangeText"
                          : "text-verox-ink/70 hover:text-verox-orangeText"
                      }`}
                      style={{ fontFamily: "var(--vx-sans)" }}
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
            <a href="#muj-verox" className="ml-auto vx-btn vx-btn--solid vx-btn--sm uppercase tracking-[0.1em]">
              Přihlásit zdarma
            </a>
          </div>
        </div>
      </div>

      {open ? (
        <div className="lg:hidden bg-verox-paper border-b-2 border-verox-orange">
          <ul className="vx-shell grid grid-cols-2 gap-2 py-3">
            {NAV_ITEMS.map((item) => (
              <li key={`m-${item.href}`}>
                <a
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={item.active ? "page" : undefined}
                  className={`block px-3 py-2 text-sm font-semibold ${
                    item.active ? "text-verox-orangeText" : "text-verox-ink/70"
                  }`}
                  style={{ fontFamily: "var(--vx-sans)" }}
                >
                  {item.label}
                </a>
              </li>
            ))}
            <li className="col-span-2 pt-1">
              <a href="#muj-verox" onClick={() => setOpen(false)} className="vx-btn vx-btn--solid vx-btn--block uppercase tracking-[0.1em]">
                Přihlásit zdarma
              </a>
            </li>
          </ul>
        </div>
      ) : null}
    </header>
  );
}
