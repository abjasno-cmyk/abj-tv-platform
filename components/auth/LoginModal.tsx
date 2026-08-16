"use client";

import { useEffect, useMemo, useState } from "react";

type ConsentOptions = { termsAccepted: boolean; newsletterOptIn: boolean };
type PasswordMode = "signin" | "signup" | "reset";

type LoginModalProps = {
  open: boolean;
  reason?: string | null;
  busyProvider: "google" | "facebook" | "email" | "password" | null;
  errorMessage: string | null;
  enableFacebook?: boolean;
  enableEmail?: boolean;
  enablePassword?: boolean;
  onClose: () => void;
  onOAuth: (provider: "google" | "facebook", options: ConsentOptions) => Promise<void>;
  onEmail: (email: string, options: ConsentOptions) => Promise<void>;
  onPasswordSignIn: (email: string, password: string) => Promise<void>;
  onPasswordSignUp: (email: string, password: string, options: ConsentOptions) => Promise<void>;
  onPasswordReset: (email: string) => Promise<void>;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

export function LoginModal({
  open,
  reason,
  busyProvider,
  errorMessage,
  enableFacebook = false,
  enableEmail = false,
  enablePassword = true,
  onClose,
  onOAuth,
  onEmail,
  onPasswordSignIn,
  onPasswordSignUp,
  onPasswordReset,
}: LoginModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordMode, setPasswordMode] = useState<PasswordMode>("signin");
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

  const validateEmail = (): string | null => {
    const normalized = email.trim();
    if (!normalized || !EMAIL_PATTERN.test(normalized)) {
      setLocalError("Zadejte prosím platný e-mail.");
      return null;
    }
    return normalized;
  };

  const submitPassword = () => {
    setLocalError(null);
    const normalizedEmail = validateEmail();
    if (!normalizedEmail) return;

    if (passwordMode === "reset") {
      void onPasswordReset(normalizedEmail);
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setLocalError(`Heslo musí mít alespoň ${MIN_PASSWORD_LENGTH} znaků.`);
      return;
    }
    if (passwordMode === "signup") {
      if (!termsAccepted) {
        setLocalError("Pro vytvoření účtu je potřeba souhlasit s podmínkami.");
        return;
      }
      void onPasswordSignUp(normalizedEmail, password, { termsAccepted, newsletterOptIn });
      return;
    }
    void onPasswordSignIn(normalizedEmail, password);
  };

  const passwordBusy = busyProvider === "password";
  const passwordSubmitLabel =
    passwordMode === "reset"
      ? passwordBusy
        ? "Odesílám odkaz…"
        : "Poslat odkaz pro obnovu hesla"
      : passwordMode === "signup"
        ? passwordBusy
          ? "Vytvářím účet…"
          : "Zaregistrovat se"
        : passwordBusy
          ? "Přihlašuji…"
          : "Přihlásit se";

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center px-4 py-6">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        aria-label="Zavřít přihlášení"
        onClick={onClose}
      />
      {/* Světlá karta dle návrhu PŘIHLÁŠENÍ (L. Robinson): oranžová horní lišta,
          tmavý titulek, obrysová tlačítka, oranžové ZAVŘÍT. */}
      <section className="relative z-[1] w-full max-w-md overflow-hidden border-[3px] border-[#ff6600] bg-white text-[#303030] shadow-[0_24px_60px_rgba(0,0,0,0.35)]">
        <p className="bg-[#ff6600] px-4 py-2 text-center text-[12px] font-bold uppercase tracking-[0.12em] text-white">
          Váš bezplatný divácký účet
        </p>

        <div className="px-5 py-5 sm:px-7 sm:py-6">
          <header className="space-y-2 text-center">
            <h2 className="text-[28px] font-extrabold uppercase leading-none tracking-wide text-[#303030]">
              {passwordMode === "signup" ? "Registrace zdarma" : "Přihlásit zdarma"}
            </h2>
            <p className="text-[13px] leading-relaxed text-[#5a5a5a]">
              Přihlaste se zdarma a získejte svůj divácký účet. Budete moci komentovat, lajkovat, ukládat si oblíbené
              pořady a pokračovat ve sledování tam, kde jste skončili.
            </p>
            <p className="text-[12px] leading-relaxed text-[#707070]">
              Účet je zdarma. Marketingové e-maily vám pošleme jen tehdy, pokud s tím zvlášť souhlasíte.
            </p>
            {helperReason ? (
              <p className="border border-[#ff6600]/40 bg-[#ff6600]/5 px-3 py-2 text-xs text-[#5a5a5a]">
                {helperReason}
              </p>
            ) : null}
          </header>

          <div className="mt-3 space-y-2">
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
              className="flex min-h-[44px] w-full items-center justify-center border-[1.5px] border-[#ff6600]/55 px-4 py-2 text-[13px] font-bold uppercase tracking-[0.06em] text-[#303030] transition hover:border-[#ff6600] hover:text-[#ff6600] disabled:opacity-60"
            >
              {busyProvider === "google" ? "Přesměrovávám…" : "Pokračovat přes Google"}
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
                className="flex min-h-[44px] w-full items-center justify-center border-[1.5px] border-[#ff6600]/55 px-4 py-2 text-[13px] font-bold uppercase tracking-[0.06em] text-[#303030] transition hover:border-[#ff6600] hover:text-[#ff6600] disabled:opacity-60"
              >
                {busyProvider === "facebook" ? "Přesměrovávám…" : "Pokračovat přes Facebook"}
              </button>
            ) : null}
          </div>

          {enablePassword ? (
            <form
              className="mt-3 space-y-2"
              onSubmit={(event) => {
                event.preventDefault();
                submitPassword();
              }}
            >
              <p className="pt-1 text-center text-[11px] font-bold uppercase tracking-[0.12em] text-[#9b9b9b]">
                {passwordMode === "reset" ? "Obnova hesla" : "Nebo e-mailem a heslem"}
              </p>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="vas@email.cz"
                className="min-h-[44px] w-full border-[1.5px] border-[#ff6600]/55 px-3 py-2 text-sm text-[#303030] outline-none placeholder:text-[#9b9b9b] focus:border-[#ff6600]"
              />
              {passwordMode !== "reset" ? (
                <input
                  type="password"
                  autoComplete={passwordMode === "signup" ? "new-password" : "current-password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={passwordMode === "signup" ? `Heslo (min. ${MIN_PASSWORD_LENGTH} znaků)` : "Heslo"}
                  className="min-h-[44px] w-full border-[1.5px] border-[#ff6600]/55 px-3 py-2 text-sm text-[#303030] outline-none placeholder:text-[#9b9b9b] focus:border-[#ff6600]"
                />
              ) : (
                <p className="text-[12px] leading-snug text-[#707070]">
                  Pošleme vám e-mail s odkazem, přes který si nastavíte nové heslo.
                </p>
              )}
              <button
                type="submit"
                disabled={busyProvider !== null}
                className="flex min-h-[44px] w-full items-center justify-center border-2 border-[#ff6600] bg-[#ff6600] px-4 py-2 text-[13px] font-bold uppercase tracking-[0.06em] text-white transition hover:bg-[#e65c00] disabled:opacity-60"
              >
                {passwordSubmitLabel}
              </button>
              <div className="flex items-center justify-between text-[12px]">
                {passwordMode === "signin" ? (
                  <>
                    <button
                      type="button"
                      className="font-semibold text-[#ff6600] hover:underline"
                      onClick={() => {
                        setLocalError(null);
                        setPasswordMode("reset");
                      }}
                    >
                      Zapomenuté heslo?
                    </button>
                    <button
                      type="button"
                      className="text-[#5a5a5a] hover:text-[#ff6600] hover:underline"
                      onClick={() => {
                        setLocalError(null);
                        setPasswordMode("signup");
                      }}
                    >
                      Nemáte účet? Registrace
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="text-[#5a5a5a] hover:text-[#ff6600] hover:underline"
                    onClick={() => {
                      setLocalError(null);
                      setPasswordMode("signin");
                    }}
                  >
                    ← Zpět na přihlášení
                  </button>
                )}
              </div>
            </form>
          ) : null}

          {enableEmail ? (
            <div className="mt-3 space-y-2">
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="vas@email.cz"
                className="min-h-[44px] w-full border-[1.5px] border-[#ff6600]/55 px-3 py-2 text-sm text-[#303030] outline-none placeholder:text-[#9b9b9b] focus:border-[#ff6600]"
              />
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
                  if (!normalizedEmail || !EMAIL_PATTERN.test(normalizedEmail)) {
                    setLocalError("Zadejte prosím platný e-mail.");
                    return;
                  }
                  void onEmail(normalizedEmail, { termsAccepted, newsletterOptIn });
                }}
                className="flex min-h-[44px] w-full items-center justify-center border-2 border-[#ff6600] bg-[#ff6600] px-4 py-2 text-[13px] font-bold uppercase tracking-[0.06em] text-white transition hover:bg-[#e65c00] disabled:opacity-60"
              >
                {busyProvider === "email" ? "Odesílám odkaz…" : "Pokračovat e-mailem"}
              </button>
            </div>
          ) : null}

          <div className="mt-4 space-y-2">
            <label className="flex items-start gap-2 text-[12px] leading-snug text-[#5a5a5a]">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(event) => setTermsAccepted(event.target.checked)}
                className="mt-[2px] h-4 w-4 accent-[#ff6600]"
              />
              Souhlasím s podmínkami používání a zásadami ochrany osobních údajů.
            </label>
            <label className="flex items-start gap-2 text-[12px] leading-snug text-[#5a5a5a]">
              <input
                type="checkbox"
                checked={newsletterOptIn}
                onChange={(event) => setNewsletterOptIn(event.target.checked)}
                className="mt-[2px] h-4 w-4 accent-[#ff6600]"
              />
              Chci dostávat e-mailové novinky a upozornění.
            </label>
            <p className="text-[12px] font-bold text-[#ff6600]">Sledování obsahu zůstává zdarma.</p>
          </div>

          {effectiveError ? <p className="mt-3 text-sm text-[#d6360b]">{effectiveError}</p> : null}

          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="bg-[#ff6600] px-5 py-2 text-[12px] font-bold uppercase tracking-[0.08em] text-white transition hover:bg-[#e65c00]"
            >
              Zavřít
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
