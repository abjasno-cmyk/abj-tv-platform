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
    <section className="rounded-[14px] border border-verox-line bg-white p-5 shadow-[0_8px_18px_rgba(17,17,17,0.10)]">
      <h2 className="vx-display text-[1.4rem] leading-none text-verox-ink">Nastavení účtu</h2>
      <hr className="vx-rule mt-3 h-[2px]" />
      <div className="mt-4 space-y-3">
        <label className="space-y-1.5">
          <span className="vx-kicker text-verox-ink">Zobrazované jméno</span>
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            className="min-h-10 w-full rounded-[10px] border border-verox-line bg-white px-3 py-2 text-sm text-verox-ink outline-none transition-colors focus:border-verox-orange"
            maxLength={120}
          />
        </label>
        <button
          type="button"
          disabled={savingProfile}
          onClick={() => {
            void saveProfile();
          }}
          className="vx-btn vx-btn--solid vx-btn--sm disabled:cursor-not-allowed disabled:opacity-60"
        >
          {savingProfile ? "Ukládám..." : "Uložit jméno"}
        </button>
      </div>

      <div className="mt-5 rounded-[10px] border border-verox-line bg-verox-paper p-4">
        <label className="flex items-start gap-2.5 text-sm text-verox-ink">
          <input
            type="checkbox"
            checked={newsletter}
            disabled={savingNewsletter}
            onChange={(event) => {
              const next = event.target.checked;
              void saveNewsletter(next);
            }}
            className="mt-[2px] h-4 w-4 accent-verox-orange"
          />
          Chci dostávat e-mailové novinky a upozornění.
        </label>
      </div>

      {message ? <p className="mt-4 text-sm text-verox-orangeText">{message}</p> : null}
      {error ? <p className="mt-2 text-sm text-verox-orangeText">{error}</p> : null}
    </section>
  );
}
