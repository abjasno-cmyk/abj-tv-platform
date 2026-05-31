"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ReplitHealthBadge } from "@/components/abj/ReplitHealthBadge";
import { VeroxLogo } from "@/components/abj/VeroxLogo";
import { VeroxMobileHeader } from "@/components/abj/VeroxMobileHeader";
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

  const activeHref = useMemo(() => {
    if (pathname.startsWith("/studio")) return "/studio";
    if (pathname.startsWith("/archiv") || pathname.startsWith("/feed") || pathname.startsWith("/videa")) return "/videa";
    if (pathname.startsWith("/abj-x") || pathname.startsWith("/v-kostce")) return "/v-kostce";
    if (pathname.startsWith("/zed") || pathname.startsWith("/komunita")) return "/komunita";
    if (pathname.startsWith("/muj-verox")) return "/muj-verox";
    if (pathname.startsWith("/live")) return "/live";
    return "";
  }, [pathname]);

  return (
    <>
      <div className="min-[481px]:hidden">
        <VeroxMobileHeader />
      </div>

      <div className="fixed inset-x-0 top-0 z-50 max-[480px]:hidden min-[481px]:block">
      <div
        onMouseEnter={revealHeader}
        onTouchStart={revealHeader}
        className={`transition-transform duration-200 ${
          isVisible ? "translate-y-0" : "-translate-y-[calc(100%-10px)]"
        }`}
      >
        <header className="bg-[#FFFFFF] px-4 font-[Helvetica,Arial,sans-serif] text-[#111111] md:px-6">
          <div className="flex h-[62px] items-center gap-4">
            <div className="flex min-w-0 items-center">
              <VeroxLogo className="verox-logo-img--desktop-header" />
              <nav className="ml-[20px] hidden md:block">
                <ul className="flex items-center gap-[18px]">
                  {navLinks.map((link) => {
                    const isActive = activeHref === link.href;
                    return (
                      <li key={`${link.href}-${link.label}`}>
                        <Link
                          href={link.href}
                          onClick={(event) => {
                            if (link.href === "/muj-verox" && !isAuthenticated) {
                              event.preventDefault();
                              openMyVeroxLoginModal();
                            }
                          }}
                          className={`border-b-[2px] pb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors ${
                            isActive
                              ? "border-[#ED742F] text-[#ED742F]"
                              : "border-transparent text-[#111111]/70 hover:text-[#111111]"
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
            <div className="pointer-events-none hidden flex-1 justify-center px-3 lg:flex">
              <p className="truncate whitespace-nowrap rounded-full bg-[#FFFFFF] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#111111]/65">
                VEROX · MAINSTREAMOVÝ DETOX
              </p>
            </div>

            <div className="ml-auto flex items-center gap-3 md:gap-4">
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#111111] md:hidden"
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
                <span className="h-1.5 w-1.5 animate-[blink_2s_ease-in-out_infinite] rounded-full bg-[#ED742F]" />
                <span className="font-[var(--font-sans)] text-[10px] font-semibold uppercase tracking-[0.14em] text-[#ED742F]">
                  Živě
                </span>
              </div>
              {isAuthenticated ? (
                <div className="hidden items-center gap-2 sm:flex">
                  <Link
                    href="/muj-verox"
                    className="inline-flex min-h-9 items-center rounded-full bg-[#FFFFFF] px-3 py-1.5 text-xs font-semibold text-[#111111] hover:text-[#ED742F]"
                  >
                    {profile?.display_name ? `Můj Verox · ${profile.display_name}` : "Můj Verox"}
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      void signOut();
                    }}
                    className="inline-flex min-h-9 items-center rounded-full px-3 py-1.5 text-xs font-semibold text-[#111111]/70 hover:text-[#111111]"
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
                  className="hidden min-h-9 items-center rounded-full border border-[#ED742F] bg-[#ED742F] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-white hover:bg-[#d86625] sm:inline-flex"
                >
                  Přihlásit zdarma
                </button>
              )}
            </div>
          </div>
          {mobileOpen ? (
            <nav className="py-2 md:hidden">
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
                        className={`block rounded-lg px-3 py-2 text-sm font-semibold transition ${
                          isActive
                            ? "bg-[rgba(237,116,47,0.12)] text-[#ED742F]"
                            : "text-[#111111]/75 hover:bg-[rgba(237,116,47,0.1)] hover:text-[#111111]"
                        }`}
                      >
                        {link.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-2 pt-2">
                {isAuthenticated ? (
                  <div className="flex items-center gap-2">
                    <Link
                      href="/muj-verox"
                      onClick={() => setMobileOpen(false)}
                      className="flex-1 rounded-lg px-3 py-2 text-center text-sm font-semibold text-[#111111]"
                    >
                      Můj Verox
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        void signOut();
                        setMobileOpen(false);
                      }}
                      className="rounded-lg px-3 py-2 text-sm font-semibold text-[#111111]/75"
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
                    className="w-full rounded-lg border border-[#ED742F] bg-[#ED742F] px-3 py-2 text-sm font-semibold text-white"
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
          className={`mx-auto block w-24 rounded-b-full bg-[#FFFFFF] transition-all ${
            isVisible ? "pointer-events-none h-0 opacity-0" : "h-[10px] opacity-100"
          }`}
        />
      </div>
    </div>
    </>
  );
}
