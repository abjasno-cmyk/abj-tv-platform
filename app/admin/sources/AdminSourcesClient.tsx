"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type SourceHealthIssue = "missing_channel_id" | "missing_channel_url" | "missing_uploads_playlist_id";
type ChannelLinkType = "channel-id" | "handle" | "username" | "custom" | "unknown";

type SourceHealthRow = {
  id: string;
  sourceName: string;
  channelId: string | null;
  channelUrl: string | null;
  uploadsPlaylistId: string | null;
  linkType: ChannelLinkType;
  linkIdentifier: string | null;
  issues: SourceHealthIssue[];
  needsAttention: boolean;
};

type SourceHealthResponse = {
  rows: SourceHealthRow[];
  summary: {
    total: number;
    missingChannelId: number;
    missingChannelUrl: number;
    missingUploadsPlaylistId: number;
    healthy: number;
  };
  error?: string;
};

type FilterMode = "all" | "issues";

const FILTERS: Array<{ key: FilterMode; label: string }> = [
  { key: "all", label: "Vše" },
  { key: "issues", label: "Jen problematické" },
];

function issueLabel(issue: SourceHealthIssue): string {
  if (issue === "missing_channel_id") return "chybí channel_id";
  if (issue === "missing_uploads_playlist_id") return "chybí uploads_playlist_id";
  return "chybí channel_url";
}

function linkTypeLabel(type: ChannelLinkType): string {
  if (type === "channel-id") return "channel id";
  if (type === "handle") return "handle";
  if (type === "username") return "username";
  if (type === "custom") return "custom URL";
  return "neznámé";
}

export function AdminSourcesClient() {
  const [secret, setSecret] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("issues");
  const [rows, setRows] = useState<SourceHealthRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<SourceHealthResponse["summary"]>({
    total: 0,
    missingChannelId: 0,
    missingChannelUrl: 0,
    missingUploadsPlaylistId: 0,
    healthy: 0,
  });

  const authHeaders = useMemo(
    () => ({
      "x-admin-secret": secret,
      "x-admin-user": "abj-admin",
    }),
    [secret]
  );

  const load = useCallback(async () => {
    if (!secret.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/sources/channel-health", {
        headers: authHeaders,
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => ({}))) as SourceHealthResponse;
      if (!response.ok) {
        throw new Error(payload.error ?? "Načtení health reportu kanálů selhalo.");
      }
      setRows(payload.rows ?? []);
      if (payload.summary) setSummary(payload.summary);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Načtení health reportu kanálů selhalo.");
    } finally {
      setLoading(false);
    }
  }, [authHeaders, secret]);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleRows = useMemo(
    () => (filterMode === "issues" ? rows.filter((row) => row.needsAttention) : rows),
    [filterMode, rows]
  );

  return (
    <section className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      <header className="rounded-2xl border border-[var(--abj-gold-dim)] bg-abj-panel p-5">
        <p className="text-[11px] uppercase tracking-[0.14em] text-abj-text2">Admin</p>
        <h1 className="mt-2 font-[var(--font-serif)] text-3xl font-semibold text-abj-text1">Health report kanálů</h1>
        <p className="mt-2 text-sm text-abj-text2">
          Kontrola mapování YouTube zdrojů na `channel_id`, `uploads_playlist_id` a URL. Bez těchto polí cron ingest
          videa nestahuje.
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
          {FILTERS.map((filter) => {
            const active = filter.key === filterMode;
            return (
              <button
                key={filter.key}
                type="button"
                onClick={() => setFilterMode(filter.key)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] ${
                  active
                    ? "border-[#FF6A00] bg-[rgba(255,106,0,0.1)] text-[#FF6A00]"
                    : "border-[var(--abj-gold-dim)] text-abj-text2"
                }`}
              >
                {filter.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => {
              void load();
            }}
            className="rounded-lg border border-[var(--abj-gold-dim)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-abj-text2"
          >
            Obnovit
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3 lg:grid-cols-5">
          <p className="rounded-lg border border-[var(--abj-gold-dim)] bg-abj-panel px-3 py-2">Celkem: {summary.total}</p>
          <p className="rounded-lg border border-[rgba(209,74,42,0.35)] bg-[rgba(209,74,42,0.08)] px-3 py-2">
            Chybí channel_id: {summary.missingChannelId}
          </p>
          <p className="rounded-lg border border-[rgba(209,74,42,0.35)] bg-[rgba(209,74,42,0.08)] px-3 py-2">
            Chybí uploads_playlist_id: {summary.missingUploadsPlaylistId}
          </p>
          <p className="rounded-lg border border-[rgba(209,74,42,0.35)] bg-[rgba(209,74,42,0.08)] px-3 py-2">
            Chybí channel_url: {summary.missingChannelUrl}
          </p>
          <p className="rounded-lg border border-[rgba(74,126,97,0.35)] bg-[rgba(74,126,97,0.08)] px-3 py-2">
            Zdravé: {summary.healthy}
          </p>
        </div>

        {error ? <p className="mt-3 text-sm text-[#D14A2A]">{error}</p> : null}
      </section>

      {loading ? (
        <p className="rounded-xl border border-[var(--abj-gold-dim)] bg-abj-panel px-4 py-4 text-sm text-abj-text2">
          Načítám health report...
        </p>
      ) : visibleRows.length === 0 ? (
        <p className="rounded-xl border border-[var(--abj-gold-dim)] bg-abj-panel px-4 py-4 text-sm text-abj-text2">
          Pro tento filtr nejsou žádné záznamy.
        </p>
      ) : (
        <div className="space-y-3">
          {visibleRows.map((row) => (
            <article
              key={row.id}
              className={`rounded-2xl border bg-white p-4 ${
                row.needsAttention ? "border-[rgba(209,74,42,0.4)]" : "border-[var(--abj-gold-dim)]"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-abj-text1">{row.sourceName}</h2>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${
                    row.needsAttention ? "bg-[rgba(209,74,42,0.12)] text-[#B13A22]" : "bg-[rgba(74,126,97,0.14)] text-[#2E6548]"
                  }`}
                >
                  {row.needsAttention ? "Vyžaduje zásah" : "OK"}
                </span>
              </div>

              <div className="mt-2 grid grid-cols-1 gap-1 text-xs text-abj-text2 sm:grid-cols-2">
                <p>channel_id: {row.channelId ?? "—"}</p>
                <p>uploads_playlist_id: {row.uploadsPlaylistId ?? "—"}</p>
                <p>channel_url: {row.channelUrl ?? "—"}</p>
                <p>typ URL: {linkTypeLabel(row.linkType)}</p>
                <p>identifikátor: {row.linkIdentifier ?? "—"}</p>
              </div>

              {row.issues.length > 0 ? (
                <p className="mt-2 text-xs text-[#B13A22]">
                  Problémy: {row.issues.map((issue) => issueLabel(issue)).join(", ")}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
