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
    <header className="h-[58px] border-b border-[rgba(17,17,17,0.14)] bg-white px-5">
      <div className="flex h-full items-center justify-between">
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

        <div className="flex items-center gap-4">
          <ReplitHealthBadge />
          <div className="hidden items-center gap-2 sm:flex">
            <span className="h-1.5 w-1.5 animate-[blink_2s_ease-in-out_infinite] rounded-full bg-abj-red" />
            <span className="font-[var(--font-sans)] text-[10px] uppercase tracking-[0.12em] text-abj-red">
              Vysílání
            </span>
          </div>
          <p className="font-[var(--font-sans)] text-[13px] tabular-nums text-abj-text2">{clock}</p>
        </div>
      </div>
    </header>
  );
}
