"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

import { VeroxLogo } from "@/components/abj/VeroxLogo";
import { getPragueDateHeader, getPragueTimeLabel } from "@/components/abj/verox-header-utils";
import { useAuth } from "@/components/auth/AuthProvider";

const MOBILE_NAV_LINKS = [
  { href: "/live", label: "ŽIVĚ" },
  { href: "/videa", label: "VIDEA" },
  { href: "/v-kostce", label: "V KOSTCE" },
  { href: "/muj-verox", label: "MŮJ VEROX" },
] as const;

export function VeroxMobileHeader() {
  const pathname = usePathname();
  const { isAuthenticated, profile, openLoginModal, signOut } = useAuth();
  const [clockLabel, setClockLabel] = useState(() => getPragueTimeLabel(new Date()));
  const [dateLabel, setDateLabel] = useState(() => getPragueDateHeader(new Date()));

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClockLabel(getPragueTimeLabel(now));
      setDateLabel(getPragueDateHeader(now));
    };
    tick();
    const timer = window.setInterval(tick, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const activeHref = useMemo(() => {
    if (pathname.startsWith("/archiv") || pathname.startsWith("/feed") || pathname.startsWith("/videa")) return "/videa";
    if (pathname.startsWith("/abj-x") || pathname.startsWith("/v-kostce")) return "/v-kostce";
    if (pathname.startsWith("/muj-verox")) return "/muj-verox";
    if (pathname.startsWith("/live")) return "/live";
    return "";
  }, [pathname]);

  const openMyVeroxLoginModal = useCallback(() => {
    openLoginModal({
      reason: "Přihlaste se zdarma a otevřete svůj divácký účet Můj Verox.",
    });
  }, [openLoginModal]);

  return (
    <header className="verox-mobile-header sticky top-0 z-50 bg-[var(--vx-white,#FFFFFF)] font-[Helvetica,Arial,sans-serif] text-[#303030]">
      <div className="verox-mobile-header-top flex items-start justify-between gap-2 pb-1 pt-2">
        <div className="verox-mobile-header-brand min-w-0 pl-[var(--L1,3.55%)]">
          <div className="inline-flex max-w-[58vw] flex-col">
            <VeroxLogo className="verox-logo-img--mobile-header" />
            <span className="verox-mobile-tagline verox-font-myriad-regular mt-0.5 uppercase tracking-[0.05em] text-[#000000]">
              MAINSTREAMOVÝ DETOX
            </span>
          </div>
        </div>

        <div className="verox-mobile-header-meta flex shrink-0 flex-col items-end pr-[var(--L1,3.55%)] text-right">
          <p className="verox-mobile-header-date verox-font-myriad-bold uppercase leading-tight tracking-normal text-[#303030]">
            {dateLabel}
          </p>
          <p className="verox-mobile-header-clock verox-font-myriad-bold leading-none tracking-[0.025em] text-[#F37021]">
            {clockLabel}
          </p>
          {isAuthenticated ? (
            <div className="verox-mobile-header-auth mt-0.5 flex flex-col items-end gap-0.5">
              <Link
                href="/muj-verox"
                className="verox-mobile-header-cta verox-font-myriad-bold uppercase tracking-[0.05em] text-[#F37021] no-underline"
              >
                {profile?.display_name ? profile.display_name : "MŮJ VEROX"}
              </Link>
              <button
                type="button"
                onClick={() => void signOut()}
                className="verox-font-myriad-bold text-[clamp(0.75rem,1.5vw,0.85rem)] uppercase tracking-[0.05em] text-[#303030]"
              >
                ODHLÁSIT
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() =>
                openLoginModal({
                  reason: "Přihlaste se zdarma a získejte svůj divácký účet.",
                })
              }
              className="verox-mobile-header-cta verox-font-myriad-bold mt-0.5 uppercase tracking-[0.05em] text-[#F37021]"
            >
              PŘIHLÁSIT ZDARMA
            </button>
          )}
        </div>
      </div>

      <nav className="verox-mobile-header-nav border-t border-[#303030]/10 px-[3.55%] pb-2 pt-1.5" aria-label="Hlavní navigace">
        <ul className="flex items-stretch justify-between gap-1">
          {MOBILE_NAV_LINKS.map((link) => {
            const isActive = activeHref === link.href;
            return (
              <li key={link.href} className="min-w-0 flex-1">
                <Link
                  href={link.href}
                  onClick={(event) => {
                    if (link.href === "/muj-verox" && !isAuthenticated) {
                      event.preventDefault();
                      openMyVeroxLoginModal();
                    }
                  }}
                  className={`verox-mobile-nav-link verox-font-myriad-regular block text-center uppercase tracking-[0.05em] ${
                    isActive
                      ? "border-b-2 border-[#F37021] pb-1 text-[#F37021]"
                      : "border-b-2 border-transparent pb-1 text-[#303030]"
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
