"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";

// Sdílená horní lišta dle návrhu Lucie Robinson („menu_listy"): velké logo
// vlevo, nav svisle vpravo, hodiny + datum vpravo (desktop) / pod logem (mobil).
// Používá ji landing (HomePage) i subpages (ABJNav) — jeden zdroj pravdy.

export type VeroxNavKey = "zive" | "videa" | "kostce" | "muj";

const DAYS = ["NEDĚLE", "PONDĚLÍ", "ÚTERÝ", "STŘEDA", "ČTVRTEK", "PÁTEK", "SOBOTA"];
const MONTHS_GEN = [
  "LEDNA", "ÚNORA", "BŘEZNA", "DUBNA", "KVĚTNA", "ČERVNA",
  "ČERVENCE", "SRPNA", "ZÁŘÍ", "ŘÍJNA", "LISTOPADU", "PROSINCE",
];
const MONTHS_NOM = [
  "LEDEN", "ÚNOR", "BŘEZEN", "DUBEN", "KVĚTEN", "ČERVEN",
  "ČERVENEC", "SRPEN", "ZÁŘÍ", "ŘÍJEN", "LISTOPAD", "PROSINEC",
];

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

interface VeroxHeaderProps {
  active?: VeroxNavKey;
}

export function VeroxHeader({ active = "zive" }: VeroxHeaderProps) {
  const { isAuthenticated, profile, openLoginModal, signOut } = useAuth();
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <header className="hf-header" aria-label="VEROX">
      <Link className="hf-logo-link" href="/live" aria-label="VEROX — Mainstreamový detox">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="hf-logo" src="/design/brand/verox-logo.png" alt="VEROX" />
      </Link>
      <div className="hf-meta">
        <p className="hf-tagline">MAINSTREAMOVÝ DETOX</p>
        <div className="hf-timeblock">
          <p className="hf-clock" suppressHydrationWarning>
            {pad(now.getHours())}:{pad(now.getMinutes())}
          </p>
          <p className="hf-date" suppressHydrationWarning>
            <span className="hf-date-m">
              {DAYS[now.getDay()]} {now.getDate()}.{MONTHS_GEN[now.getMonth()]}
            </span>
            <span className="hf-date-d">
              {now.getDate()}.{MONTHS_NOM[now.getMonth()]} {now.getFullYear()}
            </span>
          </p>
        </div>
      </div>
      <nav className="hf-nav" aria-label="Hlavní navigace">
        <Link className={active === "zive" ? "is-active" : undefined} href="/live" aria-current={active === "zive" ? "page" : undefined}>
          ŽIVĚ
        </Link>
        <Link className={active === "videa" ? "is-active" : undefined} href="/videa" aria-current={active === "videa" ? "page" : undefined}>
          VIDEA
        </Link>
        <Link className={active === "kostce" ? "is-active" : undefined} href="/v-kostce" aria-current={active === "kostce" ? "page" : undefined}>
          V KOSTCE
        </Link>
        <Link className={active === "muj" ? "is-active" : undefined} href="/muj-verox" aria-current={active === "muj" ? "page" : undefined}>
          MŮJ VEROX
        </Link>
        {isAuthenticated ? (
          <a
            className="login-link"
            href="/muj-verox"
            onClick={(e) => {
              e.preventDefault();
              void signOut();
            }}
          >
            {profile?.display_name ? profile.display_name.toUpperCase() : "ODHLÁSIT"}
          </a>
        ) : (
          <a
            className="login-link"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              openLoginModal();
            }}
          >
            PŘIHLÁSIT
          </a>
        )}
      </nav>
    </header>
  );
}
