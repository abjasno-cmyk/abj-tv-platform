"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ReplitHealthBadge } from "@/components/abj/ReplitHealthBadge";

const NAV_LINKS = [
  { href: "/live", label: "Vysílání" },
  { href: "/jasne-zpravy", label: "Jasné zprávy" },
  { href: "/archiv", label: "Nejnovější videa" },
  { href: "/abj-x", label: "VeroX" },
  { href: "/zed", label: "Zeď" },
];
const NAV_VISIBLE_TOP_THRESHOLD = 8;
const NAV_SCROLL_DELTA_THRESHOLD = 4;
const NAV_REVEAL_STICKY_MS = 1400;
const NAV_AUTOHIDE_AFTER_Y = 56;

function getPragueClockValue(date: Date): string {
  return new Intl.DateTimeFormat("cs-CZ", {
    timeZone: "Europe/Prague",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function ABJNav() {
  const pathname = usePathname();
  const [clock, setClock] = useState(() => getPragueClockValue(new Date()));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollRef = useRef(0);
  const revealTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setClock(getPragueClockValue(new Date()));
    }, 30_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (mobileOpen) return;

    const onScroll = () => {
      const currentY = window.scrollY;
      const previousY = lastScrollRef.current;
      if (currentY <= NAV_VISIBLE_TOP_THRESHOLD) {
        setIsVisible(true);
      } else if (currentY > previousY + NAV_SCROLL_DELTA_THRESHOLD) {
        setIsVisible(false);
      } else if (currentY < previousY - NAV_SCROLL_DELTA_THRESHOLD) {
        setIsVisible(true);
      }
      lastScrollRef.current = currentY;
    };

    lastScrollRef.current = window.scrollY;
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [mobileOpen]);

  useEffect(() => {
    return () => {
      if (revealTimerRef.current !== null) {
        window.clearTimeout(revealTimerRef.current);
      }
    };
  }, []);

  const revealHeader = useCallback(() => {
    setIsVisible(true);
    if (revealTimerRef.current !== null) {
      window.clearTimeout(revealTimerRef.current);
    }
    revealTimerRef.current = window.setTimeout(() => {
      if (!mobileOpen && window.scrollY > NAV_AUTOHIDE_AFTER_Y) {
        setIsVisible(false);
      }
    }, NAV_REVEAL_STICKY_MS);
  }, [mobileOpen]);

  const activeHref = useMemo(() => {
    if (pathname.startsWith("/jasne-zpravy")) return "/jasne-zpravy";
    if (pathname.startsWith("/archiv") || pathname.startsWith("/feed")) return "/archiv";
    if (pathname.startsWith("/abj-x")) return "/abj-x";
    if (pathname.startsWith("/zed")) return "/zed";
    if (pathname.startsWith("/live")) return "/live";
    return "";
  }, [pathname]);

  return (
    <div className="fixed inset-x-0 top-0 z-50">
      <div
        onMouseEnter={revealHeader}
        onTouchStart={revealHeader}
        className={`transition-transform duration-200 ${
          isVisible ? "translate-y-0" : "-translate-y-[calc(100%-10px)]"
        }`}
      >
        <header className="border-b border-[rgba(17,17,17,0.14)] bg-white px-4 md:px-5 shadow-[0_6px_18px_rgba(17,17,17,0.08)]">
          <div className="flex h-[58px] items-center justify-between">
            <div className="flex items-center">
              <div className="relative">
                <p className="font-[var(--font-serif)] text-[24px] font-extrabold tracking-[0.03em] text-abj-text1">
                  VEROX
                </p>
                <span className="absolute -right-2 top-0 h-2 w-2 rounded-full bg-abj-red" />
              </div>
              <nav className="ml-[18px] hidden md:block">
                <ul className="flex items-center gap-[22px]">
                  {NAV_LINKS.map((link) => {
                    const isActive = activeHref === link.href;
                    return (
                      <li key={`${link.href}-${link.label}`}>
                        <Link
                          href={link.href}
                          className={`border-b-[2px] pb-1 font-[var(--font-sans)] text-[12px] tracking-[0.06em] transition-colors ${
                            isActive
                              ? "border-abj-red text-abj-text1"
                              : "border-transparent text-abj-text2 hover:text-abj-text1"
                          }`}
                        >
                          {link.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </div>

            <div className="flex items-center gap-3 md:gap-4">
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(17,17,17,0.16)] text-abj-text1 md:hidden"
                aria-label={mobileOpen ? "Zavřít menu" : "Otevřít menu"}
                aria-expanded={mobileOpen}
                onClick={() =>
                  setMobileOpen((prev) => {
                    const next = !prev;
                    if (next) setIsVisible(true);
                    return next;
                  })
                }
              >
                <span className="text-lg leading-none">{mobileOpen ? "×" : "☰"}</span>
              </button>
              <div className="hidden sm:block">
                <ReplitHealthBadge />
              </div>
              <div className="hidden items-center gap-2 sm:flex">
                <span className="h-1.5 w-1.5 animate-[blink_2s_ease-in-out_infinite] rounded-full bg-abj-red" />
                <span className="font-[var(--font-sans)] text-[10px] uppercase tracking-[0.12em] text-abj-red">
                  Vysílání
                </span>
              </div>
              <p className="font-[var(--font-sans)] text-[13px] tabular-nums text-abj-text2">{clock}</p>
            </div>
          </div>
          {mobileOpen ? (
            <nav className="border-t border-[rgba(17,17,17,0.12)] py-2 md:hidden">
              <ul className="grid grid-cols-2 gap-1">
                {NAV_LINKS.map((link) => {
                  const isActive = activeHref === link.href;
                  return (
                    <li key={`mobile-${link.href}`}>
                      <Link
                        href={link.href}
                        onClick={() => setMobileOpen(false)}
                        className={`block rounded-lg px-3 py-2 text-sm font-semibold transition ${
                          isActive
                            ? "bg-[rgba(255,106,0,0.1)] text-[#FF6A00]"
                            : "text-abj-text2 hover:bg-[rgba(255,106,0,0.1)] hover:text-abj-text1"
                        }`}
                      >
                        {link.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          ) : null}
        </header>
        <button
          type="button"
          onMouseEnter={revealHeader}
          onFocus={revealHeader}
          onTouchStart={revealHeader}
          aria-label="Zobrazit navigační lištu"
          className={`mx-auto block w-24 rounded-b-full border border-t-0 border-[rgba(17,17,17,0.14)] bg-white/95 transition-all ${
            isVisible ? "pointer-events-none h-0 opacity-0" : "h-[10px] opacity-100"
          }`}
        />
      </div>
    </div>
  );
}
