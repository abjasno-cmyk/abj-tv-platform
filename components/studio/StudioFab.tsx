"use client";

import { useMemo, useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const STUDIO_ALLOWED_EMAIL = "abjasno@gmail.com";

export function StudioFab() {
  const { user, profile, isAuthenticated } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentEmail = useMemo(() => {
    return (profile?.email ?? user?.email ?? "").trim().toLowerCase();
  }, [profile?.email, user?.email]);
  const isAllowed = currentEmail === STUDIO_ALLOWED_EMAIL;

  const syncSessionForStudio = async () => {
    const supabase = createSupabaseBrowserClient();
    const sessionResult = await supabase.auth.getSession();
    const session = sessionResult.data.session;
    if (!session?.access_token) {
      return false;
    }
    document.cookie = `verox_access_token=${encodeURIComponent(session.access_token)}; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax; Secure`;
    await fetch("/api/auth/session-sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accessToken: session.access_token,
        refreshToken: session.refresh_token ?? undefined,
      }),
    }).catch(() => {
      // Best-effort sync; fallback cookie was already written.
    });
    return true;
  };

  const startStudioGoogleLogin = async () => {
    setBusy(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      if (isAuthenticated && !isAllowed) {
        await supabase.auth.signOut();
      }
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent("/studio")}`;
      const result = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: {
            prompt: "select_account",
          },
        },
      });
      if (result.error) {
        setError(result.error.message);
      }
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Přihlášení do Studia selhalo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-[70] flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={() => {
          if (isAllowed) {
            void (async () => {
              await syncSessionForStudio();
              window.location.href = "/studio";
            })();
            return;
          }
          void startStudioGoogleLogin();
        }}
        disabled={busy}
        className="rounded-full border border-[#ff6a00] bg-[#ff6a00] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(0,0,0,0.28)] transition hover:bg-[#e95f00] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? "Studio: přihlašování..." : "Studio"}
      </button>
      {error ? (
        <p className="max-w-[280px] rounded-lg border border-[#7a3d2b] bg-[#2a1814] px-3 py-2 text-xs text-[#ffcebd]">
          {error}
        </p>
      ) : null}
      {!isAllowed ? (
        <p className="max-w-[280px] rounded-lg border border-[#2f3647] bg-[#0f131b] px-3 py-2 text-[11px] text-[#c2cee2]">
          Přístup pouze pro Google účet <strong>{STUDIO_ALLOWED_EMAIL}</strong>.
        </p>
      ) : null}
    </div>
  );
}
