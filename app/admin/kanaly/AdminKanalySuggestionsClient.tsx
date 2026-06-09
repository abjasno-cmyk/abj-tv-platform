"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type ChannelSuggestion = {
  id: string;
  channel_name: string;
  channel_url: string;
  reason: string;
  user_id: string | null;
  created_at: string;
};

type SuggestionsResponse = {
  suggestions?: ChannelSuggestion[];
  error?: string;
};

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "čas neuveden";
  return new Intl.DateTimeFormat("cs-CZ", {
    timeZone: "Europe/Prague",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function isSafeYoutubeUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase();
    return host === "youtu.be" || host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com");
  } catch {
    return false;
  }
}

export function AdminKanalySuggestionsClient() {
  const [secret, setSecret] = useState("");
  const [suggestions, setSuggestions] = useState<ChannelSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authHeaders = useMemo(
    () => ({
      "x-admin-secret": secret,
      "x-admin-user": "abj-admin",
    }),
    [secret],
  );

  const load = useCallback(async () => {
    if (!secret.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/kanaly/channel-suggestions?limit=200", {
        headers: authHeaders,
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => ({}))) as SuggestionsResponse;
      if (!response.ok) {
        throw new Error(payload.error ?? "Načtení návrhů kanálů selhalo.");
      }
      setSuggestions(payload.suggestions ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Načtení návrhů kanálů selhalo.");
    } finally {
      setLoading(false);
    }
  }, [authHeaders, secret]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      <header className="rounded-2xl border border-[var(--abj-gold-dim)] bg-abj-panel p-5">
        <p className="text-[11px] uppercase tracking-[0.14em] text-abj-text2">Admin</p>
        <h1 className="mt-2 font-[var(--font-serif)] text-3xl font-semibold text-abj-text1">Návrhy kanálů</h1>
        <p className="mt-2 text-sm text-abj-text2">
          Návrhy odeslané diváky ze stránky /kanaly. Texty se zobrazují jako prostý text (bez vykreslení HTML).
        </p>
      </header>

      <section className="rounded-2xl border border-[var(--abj-gold-dim)] bg-white p-4">
        <label className="space-y-1">
          <span className="text-sm font-medium text-abj-text1">Admin secret</span>
          <input
            type="password"
            value={secret}
            onChange={(event) => setSecret(event.target.value)}
            className="w-full rounded-lg border border-[var(--abj-gold-dim)] px-3 py-2 text-sm outline-none focus:border-[#FF6A00]"
            placeholder="Vložte WALL_ADMIN_SECRET"
          />
        </label>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              void load();
            }}
            className="rounded-lg border border-[var(--abj-gold-dim)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-abj-text2"
          >
            Obnovit
          </button>
          <p className="rounded-lg border border-[var(--abj-gold-dim)] bg-abj-panel px-3 py-1.5 text-xs text-abj-text2">
            Celkem: {suggestions.length}
          </p>
        </div>

        {error ? <p className="mt-3 text-sm text-[#D14A2A]">{error}</p> : null}
      </section>

      {loading ? (
        <p className="rounded-xl border border-[var(--abj-gold-dim)] bg-abj-panel px-4 py-4 text-sm text-abj-text2">
          Načítám návrhy…
        </p>
      ) : suggestions.length === 0 ? (
        <p className="rounded-xl border border-[var(--abj-gold-dim)] bg-abj-panel px-4 py-4 text-sm text-abj-text2">
          Zatím žádné návrhy kanálů.
        </p>
      ) : (
        <div className="space-y-3">
          {suggestions.map((suggestion) => {
            const safeUrl = isSafeYoutubeUrl(suggestion.channel_url) ? suggestion.channel_url : null;
            return (
              <article key={suggestion.id} className="rounded-2xl border border-[var(--abj-gold-dim)] bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-base font-semibold text-abj-text1">{suggestion.channel_name}</h2>
                  <time className="text-xs text-abj-text2" dateTime={suggestion.created_at}>
                    {formatTime(suggestion.created_at)}
                  </time>
                </div>

                <p className="mt-2 text-sm text-abj-text2">
                  Odkaz:{" "}
                  {safeUrl ? (
                    <a
                      href={safeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-all text-[#FF6A00] underline"
                    >
                      {safeUrl}
                    </a>
                  ) : (
                    <span className="break-all">{suggestion.channel_url}</span>
                  )}
                </p>

                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-abj-text1">
                  {suggestion.reason}
                </p>

                {suggestion.user_id ? (
                  <p className="mt-2 text-xs text-abj-text2">Uživatel: {suggestion.user_id}</p>
                ) : (
                  <p className="mt-2 text-xs text-abj-text2">Odesláno anonymně</p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
