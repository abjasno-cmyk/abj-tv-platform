"use client";

import { useEffect, useMemo, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type RescueState = "idle" | "syncing" | "reloading" | "done" | "no-session" | "error";

type StudioSessionRescueProps = {
  targetPath?: string;
};

export function StudioSessionRescue({ targetPath = "/studio" }: StudioSessionRescueProps) {
  const [state, setState] = useState<RescueState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);
  const supabase = useMemo(() => {
    try {
      return createSupabaseBrowserClient();
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (attempted) return;
    let cancelled = false;

    const run = async () => {
      if (!supabase) {
        setState("error");
        setError("Supabase klient není dostupný.");
        setAttempted(true);
        return;
      }
      setState("syncing");
      const sessionResult = await supabase.auth.getSession();
      if (cancelled) return;
      const session = sessionResult.data.session;
      if (!session?.access_token || !session.refresh_token) {
        setState("no-session");
        setAttempted(true);
        return;
      }

      const response = await fetch("/api/auth/session-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
        }),
      }).catch(() => null);

      if (!response?.ok) {
        const payload = await response?.json().catch(() => ({}));
        setState("error");
        setError(
          typeof payload?.error === "string" && payload.error.trim().length > 0
            ? payload.error
            : "Synchronizace přihlášení selhala.",
        );
        setAttempted(true);
        return;
      }

      setState("reloading");
      const target = new URL(targetPath, window.location.origin);
      target.searchParams.set("session_repaired", "1");
      window.location.replace(target.toString());
    };

    void run().finally(() => {
      if (!cancelled && state !== "error" && state !== "no-session" && state !== "reloading") {
        setState("done");
      }
      if (!cancelled) {
        setAttempted(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [attempted, supabase, state, targetPath]);

  return (
    <div className="mt-4 rounded-lg border border-[#2f3647] bg-[#0b0f16] p-3 text-xs text-[#b8c2d3]">
      <p className="font-semibold text-[#dbe4f6]">Automatická oprava přihlášení</p>
      {state === "syncing" ? <p className="mt-1">Synchronizuji session mezi klientem a serverem…</p> : null}
      {state === "reloading" ? <p className="mt-1">Session opravena. Přesměrovávám do Studia…</p> : null}
      {state === "no-session" ? (
        <p className="mt-1 text-[#ffcebd]">V klientu není aktivní session. Prosím přihlas se znovu.</p>
      ) : null}
      {state === "error" ? <p className="mt-1 text-[#ffcebd]">{error ?? "Neznámá chyba synchronizace."}</p> : null}
    </div>
  );
}
