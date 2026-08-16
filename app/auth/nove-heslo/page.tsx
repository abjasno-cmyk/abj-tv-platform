"use client";

// Cíl odkazu „zapomenuté heslo": /auth/callback vymění recovery code za
// session a přesměruje sem (next=/auth/nove-heslo). Uživatel je tedy už
// přihlášený a jen si nastaví nové heslo přes updateUser.

import { useEffect, useMemo, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const MIN_PASSWORD_LENGTH = 8;

type Status = "checking" | "ready" | "no-session" | "saving" | "done";

export default function NoveHesloPage() {
  const supabase = useMemo(() => {
    try {
      return createSupabaseBrowserClient();
    } catch {
      return null;
    }
  }, []);
  const [status, setStatus] = useState<Status>("checking");
  const [password, setPassword] = useState("");
  const [passwordAgain, setPasswordAgain] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setStatus("no-session");
      return;
    }
    let cancelled = false;
    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setStatus(data.session ? "ready" : "no-session");
    });
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const submit = async () => {
    if (!supabase) return;
    setError(null);
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Heslo musí mít alespoň ${MIN_PASSWORD_LENGTH} znaků.`);
      return;
    }
    if (password !== passwordAgain) {
      setError("Hesla se neshodují.");
      return;
    }
    setStatus("saving");
    const result = await supabase.auth.updateUser({ password });
    if (result.error) {
      setStatus("ready");
      const message = result.error.message.toLowerCase().includes("different from the old")
        ? "Nové heslo musí být jiné než to současné."
        : result.error.message;
      setError(message);
      return;
    }
    setStatus("done");
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-10">
      <section className="w-full max-w-md overflow-hidden border-[3px] border-[#ff6600] bg-white text-[#303030] shadow-[0_24px_60px_rgba(0,0,0,0.2)]">
        <p className="bg-[#ff6600] px-4 py-2 text-center text-[12px] font-bold uppercase tracking-[0.12em] text-white">
          Obnova hesla
        </p>
        <div className="space-y-4 px-5 py-6 sm:px-7">
          {status === "checking" ? (
            <p className="text-sm text-[#5a5a5a]">Ověřuji odkaz…</p>
          ) : null}

          {status === "no-session" ? (
            <div className="space-y-3">
              <h1 className="text-xl font-extrabold uppercase tracking-wide">Odkaz už neplatí</h1>
              <p className="text-sm leading-relaxed text-[#5a5a5a]">
                Odkaz pro obnovu hesla vypršel nebo už byl použitý. Vraťte se na web a v přihlášení
                zvolte znovu „Zapomenuté heslo".
              </p>
              <a
                href="/live"
                className="inline-flex min-h-[44px] items-center justify-center bg-[#ff6600] px-5 py-2 text-[13px] font-bold uppercase tracking-[0.06em] text-white transition hover:bg-[#e65c00]"
              >
                Zpět na web
              </a>
            </div>
          ) : null}

          {status === "ready" || status === "saving" ? (
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                void submit();
              }}
            >
              <h1 className="text-xl font-extrabold uppercase tracking-wide">Nastavte si nové heslo</h1>
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={`Nové heslo (min. ${MIN_PASSWORD_LENGTH} znaků)`}
                className="min-h-[44px] w-full border-[1.5px] border-[#ff6600]/55 px-3 py-2 text-sm outline-none placeholder:text-[#9b9b9b] focus:border-[#ff6600]"
              />
              <input
                type="password"
                autoComplete="new-password"
                value={passwordAgain}
                onChange={(event) => setPasswordAgain(event.target.value)}
                placeholder="Nové heslo znovu"
                className="min-h-[44px] w-full border-[1.5px] border-[#ff6600]/55 px-3 py-2 text-sm outline-none placeholder:text-[#9b9b9b] focus:border-[#ff6600]"
              />
              {error ? <p className="text-sm text-[#d6360b]">{error}</p> : null}
              <button
                type="submit"
                disabled={status === "saving"}
                className="flex min-h-[44px] w-full items-center justify-center border-2 border-[#ff6600] bg-[#ff6600] px-4 py-2 text-[13px] font-bold uppercase tracking-[0.06em] text-white transition hover:bg-[#e65c00] disabled:opacity-60"
              >
                {status === "saving" ? "Ukládám…" : "Uložit nové heslo"}
              </button>
            </form>
          ) : null}

          {status === "done" ? (
            <div className="space-y-3">
              <h1 className="text-xl font-extrabold uppercase tracking-wide">Heslo změněno</h1>
              <p className="text-sm leading-relaxed text-[#5a5a5a]">
                Jste přihlášeni a nové heslo platí od teď. Příště se přihlásíte e-mailem a novým heslem.
              </p>
              <a
                href="/live"
                className="inline-flex min-h-[44px] items-center justify-center bg-[#ff6600] px-5 py-2 text-[13px] font-bold uppercase tracking-[0.06em] text-white transition hover:bg-[#e65c00]"
              >
                Pokračovat na web
              </a>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
