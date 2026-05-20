"use client";

import { useEffect, useMemo, useState } from "react";

type LoginModalProps = {
  open: boolean;
  reason?: string | null;
  busyProvider: "google" | "facebook" | "email" | null;
  errorMessage: string | null;
  onClose: () => void;
  onOAuth: (provider: "google" | "facebook", options: { termsAccepted: boolean; newsletterOptIn: boolean }) => Promise<void>;
  onEmail: (email: string, options: { termsAccepted: boolean; newsletterOptIn: boolean }) => Promise<void>;
};

export function LoginModal({ open, reason, busyProvider, errorMessage, onClose, onOAuth, onEmail }: LoginModalProps) {
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
      <section className="relative z-[1] w-full max-w-md rounded-3xl border border-[#FF6A00]/30 bg-[#121316] p-5 text-white shadow-[0_24px_60px_rgba(0,0,0,0.45)] sm:p-6">
        <header className="mb-4 space-y-2">
          <p className="text-[11px] uppercase tracking-[0.16em] text-[#FFB782]">Váš bezplatný divácký účet</p>
          <h2 className="text-2xl font-extrabold leading-tight">Přihlásit zdarma</h2>
          <p className="text-sm leading-relaxed text-[#D4D7DE]">
            Přihlaste se zdarma a získejte svůj divácký účet. Budete moci komentovat, lajkovat, ukládat si oblíbené
            pořady a pokračovat ve sledování tam, kde jste skončili.
          </p>
          <p className="text-xs text-[#B9BEC9]">
            Účet je zdarma. Marketingové e-maily vám pošleme jen tehdy, pokud s tím zvlášť souhlasíte.
          </p>
          {helperReason ? <p className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs">{helperReason}</p> : null}
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
            className="flex min-h-11 w-full items-center justify-center rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold transition hover:border-[#FF6A00] hover:bg-[#FF6A00]/15 disabled:opacity-70"
          >
            {busyProvider === "google" ? "Přesměrovávám..." : "Pokračovat přes Google"}
          </button>
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
            className="flex min-h-11 w-full items-center justify-center rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold transition hover:border-[#FF6A00] hover:bg-[#FF6A00]/15 disabled:opacity-70"
          >
            {busyProvider === "facebook" ? "Přesměrovávám..." : "Pokračovat přes Facebook"}
          </button>
        </div>

        <div className="my-4 h-px w-full bg-white/10" />

        <div className="space-y-2">
          <label className="block space-y-1">
            <span className="text-xs uppercase tracking-[0.1em] text-[#B9BEC9]">E-mail</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="vas@email.cz"
              className="min-h-11 w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-[#9BA2B2] focus:border-[#FF6A00]"
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
            className="flex min-h-11 w-full items-center justify-center rounded-xl border border-[#FF6A00]/50 bg-[#FF6A00] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#e35f00] disabled:opacity-70"
          >
            {busyProvider === "email" ? "Odesílám odkaz..." : "Pokračovat e-mailem"}
          </button>
        </div>

        <div className="mt-4 space-y-2 rounded-xl border border-white/10 bg-white/5 p-3">
          <label className="flex items-start gap-2 text-xs text-[#D4D7DE]">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(event) => setTermsAccepted(event.target.checked)}
              className="mt-[2px] h-4 w-4 rounded border-white/30 bg-transparent accent-[#FF6A00]"
            />
            Souhlasím s podmínkami používání a zásadami ochrany osobních údajů.
          </label>
          <label className="flex items-start gap-2 text-xs text-[#D4D7DE]">
            <input
              type="checkbox"
              checked={newsletterOptIn}
              onChange={(event) => setNewsletterOptIn(event.target.checked)}
              className="mt-[2px] h-4 w-4 rounded border-white/30 bg-transparent accent-[#FF6A00]"
            />
            Chci dostávat e-mailové novinky a upozornění.
          </label>
          <p className="text-[11px] text-[#B9BEC9]">Sledování obsahu zůstává zdarma.</p>
        </div>

        {effectiveError ? <p className="mt-3 text-sm text-[#FFB4A1]">{effectiveError}</p> : null}

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/20 px-3 py-1.5 text-xs uppercase tracking-[0.08em] text-[#D4D7DE] hover:border-white/40 hover:text-white"
          >
            Zavřít
          </button>
        </div>
      </section>
    </div>
  );
}
