"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ReplitHealthBadge } from "@/components/abj/ReplitHealthBadge";
import { HeaderClock } from "@/components/abj/HeaderClock";
import { useAuth } from "@/components/auth/AuthProvider";

const BASE_NAV_LINKS = [
  { href: "/live", label: "Živě" },
  { href: "/videa", label: "Videa" },
  { href: "/v-kostce", label: "V kostce" },
  { href: "/komunita", label: "Komunita" },
  { href: "/muj-verox", label: "Můj Verox" },
];
const NAV_VISIBLE_TOP_THRESHOLD = 8;
const NAV_SCROLL_DELTA_THRESHOLD = 4;
const NAV_REVEAL_STICKY_MS = 1400;
const NAV_AUTOHIDE_AFTER_Y = 56;

export function ABJNav() {
  const pathname = usePathname();
  const { isAuthenticated, profile, openLoginModal, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollRef = useRef(0);
  const revealTimerRef = useRef<number | null>(null);

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

  const openMyVeroxLoginModal = useCallback(() => {
    openLoginModal({
      reason: "Přihlaste se zdarma a otevřete svůj divácký účet Můj Verox.",
    });
  }, [openLoginModal]);

  const navLinks = BASE_NAV_LINKS;

  // The /design-system showcase ships its own self-contained VEROX header.
  const isDesignSystemRoute = pathname.startsWith("/design-system");

  const activeHref = useMemo(() => {
    if (pathname.startsWith("/studio")) return "/studio";
    if (pathname.startsWith("/archiv") || pathname.startsWith("/feed") || pathname.startsWith("/videa")) return "/videa";
    if (pathname.startsWith("/abj-x") || pathname.startsWith("/v-kostce")) return "/v-kostce";
    if (pathname.startsWith("/zed") || pathname.startsWith("/komunita")) return "/komunita";
    if (pathname.startsWith("/muj-verox")) return "/muj-verox";
    if (pathname.startsWith("/live")) return "/live";
    return "";
  }, [pathname]);

  if (isDesignSystemRoute) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 top-0 z-50">
      <div
        onMouseEnter={revealHeader}
        onTouchStart={revealHeader}
        className={`transition-transform duration-200 ${
          isVisible ? "translate-y-0" : "-translate-y-[calc(100%-10px)]"
        }`}
      >
        <header className="border-b-2 border-[#F37021] bg-[rgba(251,248,242,0.92)] px-4 text-[#171411] backdrop-blur-md md:px-6">
          <div className="mx-auto w-full max-w-[1240px]">
            {/* Tier 1 — wordmark + live clock */}
            <div className="flex items-center gap-4 pt-2.5 pb-1.5">
              <Link href="/live" className="relative z-10 inline-flex flex-col" aria-label="VEROX — Mainstreamový detox">
                <span className="relative inline-flex items-start">
                  <span className="vx-display text-[1.7rem] leading-none tracking-[-0.03em] text-[#171411]">VEROX</span>
                  <span aria-hidden="true" className="ml-[3px] mt-[2px] h-[7px] w-[7px] rounded-full bg-[#F37021]" />
                </span>
                <span className="mt-[3px] font-[var(--font-mono)] text-[0.52rem] uppercase tracking-[0.32em] text-[#717171]">
                  Mainstreamový&nbsp;detox
                </span>
              </Link>

              <div className="ml-auto flex items-center gap-4 sm:gap-5">
                <span className="hidden items-center gap-2 sm:inline-flex">
                  <span className="vx-live-dot" />
                  <span className="font-[var(--font-mono)] text-[0.6rem] font-bold uppercase tracking-[0.18em] text-[#B8480A]">
                    Živě
                  </span>
                </span>
                <HeaderClock />
                <button
                  type="button"
                  className="grid h-9 w-9 place-items-center text-[#171411] md:hidden"
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
                  <span className="text-2xl leading-none">{mobileOpen ? "×" : "≡"}</span>
                </button>
              </div>
            </div>

            {/* Tier 2 — primary nav + auth (desktop) */}
            <div className="hidden items-center gap-8 pb-2 md:flex">
              <nav>
                <ul className="flex items-center gap-7">
                  {navLinks.map((link) => {
                    const isActive = activeHref === link.href;
                    return (
                      <li key={`${link.href}-${link.label}`}>
                        <Link
                          href={link.href}
                          aria-current={isActive ? "page" : undefined}
                          onClick={(event) => {
                            if (link.href === "/muj-verox" && !isAuthenticated) {
                              event.preventDefault();
                              openMyVeroxLoginModal();
                            }
                          }}
                          className={`font-[var(--font-sans)] text-[0.78rem] font-semibold uppercase tracking-[0.13em] transition-colors ${
                            isActive ? "text-[#B8480A]" : "text-[#171411]/65 hover:text-[#B8480A]"
                          }`}
                        >
                          {link.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>

              <div className="ml-auto flex items-center gap-4">
                <div className="hidden lg:block">
                  <ReplitHealthBadge />
                </div>
                {isAuthenticated ? (
                  <div className="flex items-center gap-3">
                    <Link
                      href="/muj-verox"
                      className="text-[0.78rem] font-semibold text-[#171411] hover:text-[#B8480A]"
                    >
                      {profile?.display_name ? `Můj Verox · ${profile.display_name}` : "Můj Verox"}
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        void signOut();
                      }}
                      className="text-[0.78rem] font-semibold text-[#171411]/65 hover:text-[#171411]"
                    >
                      Odhlásit
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      openLoginModal({
                        reason: "Komentujte, lajkujte a pokračujte tam, kde jste skončili.",
                      })
                    }
                    className="vx-btn vx-btn--solid vx-btn--sm uppercase tracking-[0.08em]"
                  >
                    Přihlásit zdarma
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Mobile menu */}
          {mobileOpen ? (
            <nav className="mx-auto w-full max-w-[1240px] pb-3 md:hidden">
              <ul className="grid grid-cols-2 gap-1">
                {navLinks.map((link) => {
                  const isActive = activeHref === link.href;
                  return (
                    <li key={`mobile-${link.href}`}>
                      <Link
                        href={link.href}
                        onClick={(event) => {
                          if (link.href === "/muj-verox" && !isAuthenticated) {
                            event.preventDefault();
                            setMobileOpen(false);
                            openMyVeroxLoginModal();
                            return;
                          }
                          setMobileOpen(false);
                        }}
                        className={`block px-3 py-2 text-sm font-semibold ${
                          isActive ? "text-[#B8480A]" : "text-[#171411]/75"
                        }`}
                      >
                        {link.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-2 pt-1">
                {isAuthenticated ? (
                  <div className="flex items-center gap-2">
                    <Link
                      href="/muj-verox"
                      onClick={() => setMobileOpen(false)}
                      className="flex-1 px-3 py-2 text-center text-sm font-semibold text-[#171411]"
                    >
                      Můj Verox
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        void signOut();
                        setMobileOpen(false);
                      }}
                      className="px-3 py-2 text-sm font-semibold text-[#171411]/75"
                    >
                      Odhlásit
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      openLoginModal({
                        reason: "Přihlaste se zdarma a získejte svůj divácký účet.",
                      });
                      setMobileOpen(false);
                    }}
                    className="vx-btn vx-btn--solid vx-btn--block uppercase tracking-[0.08em]"
                  >
                    Přihlásit zdarma
                  </button>
                )}
              </div>
            </nav>
          ) : null}
        </header>

        <button
          type="button"
          onMouseEnter={revealHeader}
          onFocus={revealHeader}
          onTouchStart={revealHeader}
          aria-label="Zobrazit navigační lištu"
          className={`mx-auto block w-24 rounded-b-full bg-[rgba(251,248,242,0.92)] transition-all ${
            isVisible ? "pointer-events-none h-0 opacity-0" : "h-[10px] opacity-100"
          }`}
        />
      </div>
    </div>
  );
}
