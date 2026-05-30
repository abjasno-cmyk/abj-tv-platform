"use client";

import { useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";

type MyVeroxSettingsProps = {
  initialDisplayName: string;
  initialNewsletterGranted: boolean;
};

export function MyVeroxSettings({ initialDisplayName, initialNewsletterGranted }: MyVeroxSettingsProps) {
  const { refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [newsletter, setNewsletter] = useState(initialNewsletterGranted);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingNewsletter, setSavingNewsletter] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const saveProfile = async () => {
    setSavingProfile(true);
    setError(null);
    setMessage(null);
    const response = await fetch("/api/viewer/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName,
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    setSavingProfile(false);
    if (!response.ok) {
      setError(payload.error ?? "Nastavení účtu se nepodařilo uložit.");
      return;
    }
    setMessage("Nastavení účtu bylo uloženo.");
    await refreshProfile();
  };

  const saveNewsletter = async (nextValue: boolean) => {
    setSavingNewsletter(true);
    setError(null);
    setMessage(null);
    const response = await fetch("/api/viewer/consents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        consentType: "newsletter",
        granted: nextValue,
        source: "my_verox_settings",
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    setSavingNewsletter(false);
    if (!response.ok) {
      setError(payload.error ?? "Souhlas se nepodařilo uložit.");
      return;
    }
    setNewsletter(nextValue);
    setMessage("Souhlas s e-mailovými novinkami byl aktualizován.");
  };

  return (
    <section className="rounded-2xl border border-[rgba(17,17,17,0.14)] bg-white p-4">
      <h2 className="text-lg font-extrabold text-abj-text1">Nastavení účtu</h2>
      <div className="mt-3 space-y-3">
        <label className="space-y-1">
          <span className="text-xs uppercase tracking-[0.1em] text-abj-text2">Zobrazované jméno</span>
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            className="min-h-10 w-full rounded-lg border border-[var(--abj-gold-dim)] px-3 py-2 text-sm text-abj-text1 outline-none focus:border-[#F37021]"
            maxLength={120}
          />
        </label>
        <button
          type="button"
          disabled={savingProfile}
          onClick={() => {
            void saveProfile();
          }}
          className="inline-flex min-h-10 items-center rounded-full border border-[#F37021] bg-[#F37021] px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white disabled:opacity-60"
        >
          {savingProfile ? "Ukládám..." : "Uložit jméno"}
        </button>
      </div>

      <div className="mt-4 rounded-xl border border-[rgba(17,17,17,0.12)] bg-abj-panel p-3">
        <label className="flex items-start gap-2 text-sm text-abj-text1">
          <input
            type="checkbox"
            checked={newsletter}
            disabled={savingNewsletter}
            onChange={(event) => {
              const next = event.target.checked;
              void saveNewsletter(next);
            }}
            className="mt-[2px] h-4 w-4 accent-[#F37021]"
          />
          Chci dostávat e-mailové novinky a upozornění.
        </label>
      </div>

      {message ? <p className="mt-3 text-sm text-[#0F7B48]">{message}</p> : null}
      {error ? <p className="mt-2 text-sm text-[#D14A2A]">{error}</p> : null}
    </section>
  );
}
