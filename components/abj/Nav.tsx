"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { ReplitHealthBadge } from "@/components/abj/ReplitHealthBadge";

const NAV_LINKS = [
  { href: "/live", label: "Vysílání" },
  { href: "/videos", label: "Context" },
  { href: "/archiv", label: "Přehled dne" },
  { href: "/abj-x", label: "ABJ X" },
  { href: "/program", label: "Program" },
];

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

  useEffect(() => {
    const timer = setInterval(() => {
      setClock(getPragueClockValue(new Date()));
    }, 30_000);
    return () => clearInterval(timer);
  }, []);

  const activeHref = useMemo(() => {
    if (pathname.startsWith("/videos")) return "/videos";
    if (pathname.startsWith("/archiv") || pathname.startsWith("/feed")) return "/archiv";
    if (pathname.startsWith("/abj-x")) return "/abj-x";
    if (pathname.startsWith("/program")) return "/program";
    if (pathname.startsWith("/live")) return "/live";
    return "";
  }, [pathname]);

  return (
    <header className="border-b border-[rgba(17,17,17,0.14)] bg-white px-4 md:px-5">
      <div className="flex h-[58px] items-center justify-between">
        <div className="flex items-center">
          <div className="relative">
            <p className="font-[var(--font-serif)] text-[24px] font-extrabold tracking-[0.03em] text-abj-text1">
              ABJ
            </p>
            <span className="absolute -right-2 top-0 h-2 w-2 rounded-full bg-abj-red" />
          </div>
          <span className="mx-[12px] text-[rgba(17,17,17,0.25)]">|</span>
          <p className="font-[var(--font-sans)] text-[10px] uppercase tracking-[0.2em] text-abj-text2">
            Geometric Live
          </p>

          <nav className="ml-[26px] hidden md:block">
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
            onClick={() => setMobileOpen((prev) => !prev)}
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
  );
}
