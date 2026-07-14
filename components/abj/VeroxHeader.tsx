"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { HeroAudienceIndicator } from "@/components/abj/HeroAudienceIndicator";
import { useAuth } from "@/components/auth/AuthProvider";
import { LOCALE_CS, LOCALE_EN, type VeroxLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";

// Sdílená horní lišta dle návrhu Lucie Robinson („menu_listy"): velké logo
// vlevo, nav svisle vpravo, hodiny + datum vpravo (desktop) / pod logem (mobil).
// Používá ji landing (HomePage) i subpages (ABJNav) — jeden zdroj pravdy.

export type VeroxNavKey = "zive" | "videa" | "noviny" | "nazory" | "kanaly" | "muj";

const DAYS = ["NEDĚLE", "PONDĚLÍ", "ÚTERÝ", "STŘEDA", "ČTVRTEK", "PÁTEK", "SOBOTA"];
const DAYS_EN = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
const MONTHS_GEN = [
  "LEDNA", "ÚNORA", "BŘEZNA", "DUBNA", "KVĚTNA", "ČERVNA",
  "ČERVENCE", "SRPNA", "ZÁŘÍ", "ŘÍJNA", "LISTOPADU", "PROSINCE",
];
const MONTHS_NOM = [
  "LEDEN", "ÚNOR", "BŘEZEN", "DUBEN", "KVĚTEN", "ČERVEN",
  "ČERVENEC", "SRPEN", "ZÁŘÍ", "ŘÍJEN", "LISTOPAD", "PROSINEC",
];
const MONTHS_EN = [
  "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
  "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
];

const EN_WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

// Vždy pražský čas (Europe/Prague) nezávisle na časové zóně serveru/prohlížeče.
// Tím zmizí počáteční posun (UTC vs. Praha) i hydration mismatch.
function pragueParts(d: Date): {
  hour: string;
  minute: string;
  weekday: string;
  day: number;
  monthIndex: number;
  year: string;
} {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Prague",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    hour: get("hour"),
    minute: get("minute"),
    weekday: DAYS[EN_WEEKDAY_INDEX[get("weekday")] ?? 0],
    day: Number(get("day")),
    monthIndex: Number(get("month")) - 1,
    year: get("year"),
  };
}

interface VeroxHeaderProps {
  active?: VeroxNavKey;
  /** Počítadlo „Právě sleduje" pod datem — jen na /live. */
  showAudience?: boolean;
  locale?: VeroxLocale;
}

function stripEnglishPrefix(pathname: string): string {
  if (pathname === "/en") return "/live";
  return pathname.replace(/^\/en(?=\/|$)/, "") || "/live";
}

function withEnglishPrefix(pathname: string): string {
  if (pathname === "/en" || pathname.startsWith("/en/")) return pathname;
  return `/en${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
}

function isPreviewLikeHost(host: string): boolean {
  const normalized = host.toLowerCase();
  return (
    normalized.includes("localhost") ||
    normalized.includes("127.0.0.1") ||
    normalized.endsWith(".vercel.app") ||
    normalized.includes("-git-")
  );
}

function isPreviewLikeRuntime(): boolean {
  const vercelEnv = (process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.VERCEL_ENV ?? "").toLowerCase();
  return vercelEnv === "preview" || vercelEnv === "development";
}

function languageHref(targetLocale: VeroxLocale, pathname: string): string {
  const path = pathname || "/live";
  if (
    isPreviewLikeRuntime() ||
    (typeof window !== "undefined" && isPreviewLikeHost(window.location.host))
  ) {
    return targetLocale === LOCALE_EN ? withEnglishPrefix(path) : stripEnglishPrefix(path);
  }

  if (targetLocale === LOCALE_EN) {
    const origin = process.env.NEXT_PUBLIC_VEROX_EN_ORIGIN?.trim() || "https://www.veroxmed.com";
    return `${origin}${stripEnglishPrefix(path)}`;
  }
  const origin = process.env.NEXT_PUBLIC_VEROX_CS_ORIGIN?.trim() || "https://www.verox.cz";
  return `${origin}${stripEnglishPrefix(path)}`;
}

function shouldUseEnglishPathPrefix(locale: VeroxLocale, pathname: string): boolean {
  if (locale !== LOCALE_EN) return false;
  if (pathname === "/en" || pathname.startsWith("/en/")) return true;
  if (typeof window === "undefined") return false;
  return isPreviewLikeHost(window.location.host);
}

function localizedHref(locale: VeroxLocale, pathname: string, href: string): string {
  if (!shouldUseEnglishPathPrefix(locale, pathname)) return href;
  return withEnglishPrefix(href);
}

export function VeroxHeader({ active, showAudience = false, locale = LOCALE_CS }: VeroxHeaderProps) {
  const { isAuthenticated, profile, openLoginModal, signOut } = useAuth();
  const [now, setNow] = useState<Date>(() => new Date());
  const pathname = usePathname();
  const dictionary = getDictionary(locale);
  const isEnglish = locale === LOCALE_EN;

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const t = pragueParts(now);
  const weekday = isEnglish ? DAYS_EN[DAYS.indexOf(t.weekday)] ?? t.weekday : t.weekday;
  const mobileMonth = isEnglish ? MONTHS_EN[t.monthIndex] : MONTHS_GEN[t.monthIndex];
  const desktopMonth = isEnglish ? MONTHS_EN[t.monthIndex] : MONTHS_NOM[t.monthIndex];

  return (
    <header className="hf-header" aria-label="VEROX">
      <Link className="hf-logo-link" href={localizedHref(locale, pathname, "/live")} aria-label="VEROX — Mainstreamový detox">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="hf-logo" src="/design/brand/verox-logo.png" alt="VEROX" />
      </Link>
      <div className="hf-meta">
        <p className="hf-tagline">{dictionary.header.tagline}</p>
        <div className="hf-timeblock">
          <p className="hf-clock" suppressHydrationWarning>
            {t.hour}:{t.minute}
          </p>
          <p className="hf-date" suppressHydrationWarning>
            <span className="hf-date-m">
              {isEnglish ? `${weekday} ${mobileMonth} ${t.day}` : `${weekday} ${t.day}.${mobileMonth}`}
            </span>
            <span className="hf-date-d">
              {isEnglish ? `${desktopMonth} ${t.day}, ${t.year}` : `${t.day}.${desktopMonth} ${t.year}`}
            </span>
          </p>
          {showAudience ? <HeroAudienceIndicator /> : null}
        </div>
      </div>
      <nav className="hf-nav" aria-label="Hlavní navigace">
        <Link className={active === "zive" ? "is-active" : undefined} href={localizedHref(locale, pathname, "/live")} aria-current={active === "zive" ? "page" : undefined}>
          {dictionary.header.nav.live}
        </Link>
        <Link className={active === "videa" ? "is-active" : undefined} href={localizedHref(locale, pathname, "/videa")} aria-current={active === "videa" ? "page" : undefined}>
          {dictionary.header.nav.latestVideos}
        </Link>
        <Link className={active === "noviny" ? "is-active" : undefined} href={localizedHref(locale, pathname, "/noviny")} aria-current={active === "noviny" ? "page" : undefined}>
          {dictionary.header.nav.news}
        </Link>
        <Link className={active === "nazory" ? "is-active" : undefined} href={localizedHref(locale, pathname, "/nazory")} aria-current={active === "nazory" ? "page" : undefined}>
          {dictionary.header.nav.opinions}
        </Link>
        <Link className={active === "kanaly" ? "is-active" : undefined} href={localizedHref(locale, pathname, "/kanaly")} aria-current={active === "kanaly" ? "page" : undefined}>
          {dictionary.header.nav.channels}
        </Link>
        <Link className={active === "muj" ? "is-active" : undefined} href={localizedHref(locale, pathname, "/muj-verox")} aria-current={active === "muj" ? "page" : undefined}>
          {dictionary.header.nav.myVerox}
        </Link>
        <div className="hf-lang-switch" aria-label={dictionary.header.language.label}>
          <a className={locale === LOCALE_CS ? "is-active" : undefined} href={languageHref(LOCALE_CS, pathname)}>
            {dictionary.header.language.cs}
          </a>
          <span aria-hidden="true">/</span>
          <a className={locale === LOCALE_EN ? "is-active" : undefined} href={languageHref(LOCALE_EN, pathname)}>
            {dictionary.header.language.en}
          </a>
        </div>
        {isAuthenticated ? (
          <a
            className="login-link"
            href="/muj-verox"
            onClick={(e) => {
              e.preventDefault();
              void signOut();
            }}
          >
            {profile?.display_name ? profile.display_name.toUpperCase() : dictionary.header.nav.signOut}
          </a>
        ) : (
          <a
            className="login-link"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              openLoginModal({
                reason:
                  active === "zive"
                    ? dictionary.header.authReason.live
                    : dictionary.header.authReason.default,
              });
            }}
          >
            {dictionary.header.nav.signIn}
          </a>
        )}
      </nav>
    </header>
  );
}
