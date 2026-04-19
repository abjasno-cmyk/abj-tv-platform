"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/live", label: "Vysílání" },
  { href: "/archiv", label: "Přehled dne" },
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

  useEffect(() => {
    const timer = setInterval(() => {
      setClock(getPragueClockValue(new Date()));
    }, 30_000);
    return () => clearInterval(timer);
  }, []);

  const activeHref = useMemo(() => {
    if (pathname.startsWith("/archiv") || pathname.startsWith("/feed")) return "/archiv";
    if (pathname.startsWith("/program")) return "/program";
    if (pathname.startsWith("/live")) return "/live";
    return "";
  }, [pathname]);

  return (
    <header className="h-[46px] border-b border-[var(--abj-gold-dim)] bg-abj-deep px-5">
      <div className="flex h-full items-center justify-between">
        <div className="flex items-center">
          <p className="font-[var(--font-serif)] text-[17px] font-bold tracking-[0.07em] text-abj-gold">ABJ</p>
          <span className="mx-[10px] text-[rgba(198,168,91,0.25)]">|</span>
          <p className="font-[var(--font-sans)] text-[10px] uppercase tracking-[0.2em] text-abj-text2">Síť</p>

          <nav className="ml-[26px]">
            <ul className="flex items-center gap-[22px]">
              {NAV_LINKS.map((link) => {
                const isActive = activeHref === link.href;
                return (
                  <li key={`${link.href}-${link.label}`}>
                    <Link
                      href={link.href}
                      className={`border-b-[1.5px] pb-1 font-[var(--font-sans)] text-[12px] tracking-[0.06em] ${
                        isActive
                          ? "border-abj-gold text-abj-gold"
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

        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 animate-[blink_2s_ease-in-out_infinite] rounded-full bg-abj-red" />
            <span className="font-[var(--font-sans)] text-[10px] uppercase tracking-[0.12em] text-[#C07070]">
              Vysílání
            </span>
          </div>
          <p className="font-[var(--font-sans)] text-[13px] tabular-nums text-abj-text2">{clock}</p>
        </div>
      </div>
    </header>
  );
}
