"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";

// Hlavní navigace dle klientské šablony (zasilka VH8GJ2ZEGTRX3GX5):
// logo + tagline vlevo, hodiny+datum, položky menu vpravo. Lišta je sticky
// (drží nahoře). Položky jsou zatím TEXT — až grafička dodá SVG „masky",
// stačí v NAV_ITEMS doplnit `svg` a render přepnout na <img>.

type NavItem = { href: string; label: string; key: string };

const NAV_ITEMS: NavItem[] = [
  { href: "/live", label: "ŽIVĚ", key: "zive" },
  { href: "/videa", label: "VIDEA", key: "videa" },
  { href: "/v-kostce", label: "V KOSTCE", key: "kostce" },
  { href: "/muj-verox", label: "MŮJ VEROX", key: "muj" },
];

const DAYS = ["NEDĚLE", "PONDĚLÍ", "ÚTERÝ", "STŘEDA", "ČTVRTEK", "PÁTEK", "SOBOTA"];
const MONTHS = [
  "LEDNA", "ÚNORA", "BŘEZNA", "DUBNA", "KVĚTNA", "ČERVNA",
  "ČERVENCE", "SRPNA", "ZÁŘÍ", "ŘÍJNA", "LISTOPADU", "PROSINCE",
];

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function ClockDate() {
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const date = `${DAYS[now.getDay()]} ${now.getDate()}. ${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
  return (
    <>
      <div className="vx-clock" suppressHydrationWarning>
        {pad(now.getHours())}:{pad(now.getMinutes())}
      </div>
      <div className="vx-date" suppressHydrationWarning>{date}</div>
    </>
  );
}

export function ABJNav() {
  const pathname = usePathname();
  const { isAuthenticated, profile, openLoginModal, signOut } = useAuth();

  const activeKey = useMemo(() => {
    if (pathname.startsWith("/videa") || pathname.startsWith("/archiv") || pathname.startsWith("/feed")) return "videa";
    if (pathname.startsWith("/v-kostce") || pathname.startsWith("/abj-x")) return "kostce";
    if (pathname.startsWith("/muj-verox")) return "muj";
    if (pathname.startsWith("/komunita") || pathname.startsWith("/zed")) return "muj";
    if (pathname.startsWith("/live") || pathname === "/") return "zive";
    return "zive";
  }, [pathname]);

  // Landing /live má vlastní hlavičku dle handoffu (viz HomePage), globální
  // lišta tam ustoupí.
  if (pathname.startsWith("/live")) {
    return null;
  }

  return (
    <header className="vx-hdr">
      <div className="vx-hdr-inner">
        <div className="vx-hdr-top">
          <Link href="/live" className="vx-logo" aria-label="VEROX — Mainstreamový detox">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="logo-img" src="/brand/verox-logo.svg" alt="VEROX" />
            <small>MAINSTREAMOVÝ DETOX</small>
          </Link>
          <div className="vx-hdr-clock">
            <ClockDate />
          </div>
        </div>

        <nav className="vx-nav" aria-label="Hlavní navigace">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={activeKey === item.key ? "active" : undefined}
              aria-current={activeKey === item.key ? "page" : undefined}
            >
              {/* TODO: až dorazí SVG masky, nahradit <span> za <img src=...> */}
              <span>{item.label}</span>
            </Link>
          ))}
          {isAuthenticated ? (
            <a
              href="/muj-verox"
              className="login"
              onClick={(e) => {
                e.preventDefault();
                void signOut();
              }}
            >
              <span>{profile?.display_name ? profile.display_name.toUpperCase() : "ODHLÁSIT"}</span>
            </a>
          ) : (
            <a
              href="#"
              className="login"
              onClick={(e) => {
                e.preventDefault();
                openLoginModal({ reason: "Přihlaste se zdarma a získejte svůj divácký účet." });
              }}
            >
              <span>PŘIHLÁSIT ZDARMA</span>
            </a>
          )}
        </nav>
      </div>
    </header>
  );
}
