"use client";

import { useEffect, useMemo, useState } from "react";

type LoginModalProps = {
  open: boolean;
  reason?: string | null;
  busyProvider: "google" | "facebook" | "email" | null;
  errorMessage: string | null;
  enableFacebook?: boolean;
  enableEmail?: boolean;
  onClose: () => void;
  onOAuth: (provider: "google" | "facebook", options: { termsAccepted: boolean; newsletterOptIn: boolean }) => Promise<void>;
  onEmail: (email: string, options: { termsAccepted: boolean; newsletterOptIn: boolean }) => Promise<void>;
};

export function LoginModal({
  open,
  reason,
  busyProvider,
  errorMessage,
  enableFacebook = false,
  enableEmail = false,
  onClose,
  onOAuth,
  onEmail,
}: LoginModalProps) {
  const [email, setEmail] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [newsletterOptIn, setNewsletterOptIn] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const effectiveError = localError ?? errorMessage;
  const helperReason = useMemo(() => {
    const trimmed = reason?.trim();
    if (!trimmed) return null;
    return trimmed;
  }, [reason]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center px-4 py-6">
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
        aria-label="Zavřít přihlášení"
        onClick={onClose}
      />
      <section className="relative z-[1] w-full max-w-md rounded-[14px] border border-verox-line bg-white p-5 text-verox-ink shadow-[0_18px_40px_rgba(17,17,17,0.18)] sm:p-6">
        <header className="mb-4 space-y-2">
          <p className="vx-kicker text-verox-orangeDeep">Váš bezplatný divácký účet</p>
          <h2 className="vx-display text-verox-ink" style={{ fontSize: "1.7rem" }}>
            Přihlásit zdarma
          </h2>
          <p className="text-sm leading-relaxed text-verox-charcoal">
            Přihlaste se zdarma a získejte svůj divácký účet. Budete moci komentovat, lajkovat, ukládat si oblíbené
            pořady a pokračovat ve sledování tam, kde jste skončili.
          </p>
          <p className="vx-meta">
            Účet je zdarma. Marketingové e-maily vám pošleme jen tehdy, pokud s tím zvlášť souhlasíte.
          </p>
          {helperReason ? (
            <p className="rounded-[10px] border border-verox-line bg-[#FBF8F2] px-3 py-2 text-xs text-verox-charcoal">{helperReason}</p>
          ) : null}
        </header>

        <div className="space-y-2">
          <button
            type="button"
            disabled={busyProvider !== null}
            onClick={() => {
              setLocalError(null);
              if (!termsAccepted) {
                setLocalError("Pro vytvoření účtu je potřeba souhlasit s podmínkami.");
                return;
              }
              void onOAuth("google", { termsAccepted, newsletterOptIn });
            }}
            className="vx-btn vx-btn--ghost-ink vx-btn--block min-h-11 disabled:opacity-70"
          >
            {busyProvider === "google" ? "Přesměrovávám..." : "Pokračovat přes Google"}
          </button>
          {enableFacebook ? (
            <button
              type="button"
              disabled={busyProvider !== null}
              onClick={() => {
                setLocalError(null);
                if (!termsAccepted) {
                  setLocalError("Pro vytvoření účtu je potřeba souhlasit s podmínkami.");
                  return;
                }
                void onOAuth("facebook", { termsAccepted, newsletterOptIn });
              }}
              className="vx-btn vx-btn--ghost-ink vx-btn--block min-h-11 disabled:opacity-70"
            >
              {busyProvider === "facebook" ? "Přesměrovávám..." : "Pokračovat přes Facebook"}
            </button>
          ) : null}
        </div>

        {enableEmail ? <hr className="vx-rule-soft my-4" /> : null}

        {enableEmail ? (
          <div className="space-y-2">
            <label className="block space-y-1">
              <span className="vx-kicker">E-mail</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="vas@email.cz"
                className="min-h-11 w-full rounded-[10px] border border-verox-line bg-[#FBF8F2] px-3 py-2 text-sm text-verox-ink outline-none placeholder:text-verox-gray focus:border-verox-orange"
              />
            </label>
            <button
              type="button"
              disabled={busyProvider !== null}
              onClick={() => {
                setLocalError(null);
                if (!termsAccepted) {
                  setLocalError("Pro vytvoření účtu je potřeba souhlasit s podmínkami.");
                  return;
                }
                const normalizedEmail = email.trim();
                if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
                  setLocalError("Zadejte prosím platný e-mail.");
                  return;
                }
                void onEmail(normalizedEmail, { termsAccepted, newsletterOptIn });
              }}
              className="vx-btn vx-btn--solid vx-btn--block min-h-11 disabled:opacity-70"
            >
              {busyProvider === "email" ? "Odesílám odkaz..." : "Pokračovat e-mailem"}
            </button>
          </div>
        ) : (
          <p className="vx-meta mt-4">Další způsoby přihlášení přidáme brzy.</p>
        )}

        <div className="mt-4 space-y-2 rounded-[10px] border border-verox-line bg-[#FBF8F2] p-3">
          <label className="flex items-start gap-2 text-xs text-verox-charcoal">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(event) => setTermsAccepted(event.target.checked)}
              className="mt-[2px] h-4 w-4 rounded border-verox-line accent-[#F37021]"
            />
            Souhlasím s podmínkami používání a zásadami ochrany osobních údajů.
          </label>
          <label className="flex items-start gap-2 text-xs text-verox-charcoal">
            <input
              type="checkbox"
              checked={newsletterOptIn}
              onChange={(event) => setNewsletterOptIn(event.target.checked)}
              className="mt-[2px] h-4 w-4 rounded border-verox-line accent-[#F37021]"
            />
            Chci dostávat e-mailové novinky a upozornění.
          </label>
          <p className="vx-meta">Sledování obsahu zůstává zdarma.</p>
        </div>

        {effectiveError ? <p className="mt-3 text-sm font-medium text-verox-orangeText">{effectiveError}</p> : null}

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="vx-btn vx-btn--ghost-ink vx-btn--sm"
          >
            Zavřít
          </button>
        </div>
      </section>
    </div>
  );
}
