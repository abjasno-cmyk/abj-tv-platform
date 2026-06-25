"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { NovinyCategoryRow, NovinySourceRow } from "@/lib/noviny/types";

type SourcesResponse = {
  sources?: NovinySourceRow[];
  categories?: NovinyCategoryRow[];
  error?: string;
};

type CreateSourceForm = {
  name: string;
  rssUrl: string;
  homepageUrl: string;
  language: string;
  country: string;
  categoryId: string;
  allowImages: boolean;
  legalNote: string;
};

const INITIAL_FORM: CreateSourceForm = {
  name: "",
  rssUrl: "",
  homepageUrl: "",
  language: "cs",
  country: "CZ",
  categoryId: "",
  allowImages: false,
  legalNote: "",
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("cs-CZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/Prague",
  }).format(date);
}

export function NovinySourcesAdminClient() {
  const [sources, setSources] = useState<NovinySourceRow[]>([]);
  const [categories, setCategories] = useState<NovinyCategoryRow[]>([]);
  const [form, setForm] = useState<CreateSourceForm>(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingSourceId, setPendingSourceId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/noviny/sources", {
        credentials: "include",
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => ({}))) as SourcesResponse;
      if (!response.ok) {
        throw new Error(payload.error ?? "Načtení zdrojů selhalo.");
      }
      setSources(payload.sources ?? []);
      setCategories(payload.categories ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Načtení zdrojů selhalo.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const categoryOptions = useMemo(
    () => categories.map((category) => ({ id: category.id, label: category.name })),
    [categories],
  );

  const createSource = async () => {
    setSubmitting(true);
    setError(null);
    setStatus(null);
    try {
      const response = await fetch("/api/admin/noviny/sources", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Vytvoření zdroje selhalo.");
      }
      setStatus("Zdroj byl přidán.");
      setForm(INITIAL_FORM);
      await load();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Vytvoření zdroje selhalo.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleSource = async (source: NovinySourceRow) => {
    setPendingSourceId(source.id);
    setError(null);
    setStatus(null);
    try {
      const response = await fetch(`/api/admin/noviny/sources/${encodeURIComponent(source.id)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !source.is_active }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Aktualizace zdroje selhala.");
      }
      setStatus(source.is_active ? "Zdroj byl vypnut." : "Zdroj byl znovu aktivován.");
      await load();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Aktualizace zdroje selhala.");
    } finally {
      setPendingSourceId(null);
    }
  };

  const refreshSource = async (source: NovinySourceRow) => {
    setPendingSourceId(source.id);
    setError(null);
    setStatus(null);
    try {
      const response = await fetch(`/api/admin/noviny/sources/${encodeURIComponent(source.id)}/refresh`, {
        method: "POST",
        credentials: "include",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        report?: { importedCount: number; deduplicatedCount: number; errorSources: number };
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Ruční refresh zdroje selhal.");
      }
      const report = payload.report;
      setStatus(
        `Refresh zdroje dokončen. Importováno: ${report?.importedCount ?? 0}, deduplikováno: ${report?.deduplicatedCount ?? 0}, chyby: ${report?.errorSources ?? 0}.`,
      );
      await load();
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Ruční refresh zdroje selhal.");
    } finally {
      setPendingSourceId(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      <nav className="text-sm text-abj-text2">
        <Link href="/admin/noviny" className="font-semibold hover:text-abj-text1">
          ← Zpět na přehled Novin
        </Link>
      </nav>

      <header className="rounded-2xl border border-[var(--abj-gold-dim)] bg-abj-panel p-6">
        <p className="text-[11px] uppercase tracking-[0.14em] text-abj-text2">Admin · Noviny</p>
        <h1 className="mt-2 text-3xl font-semibold text-abj-text1">Zdroje RSS</h1>
        <p className="mt-2 text-sm text-abj-text2">
          Přidání zdroje, vypnutí zdroje a ruční refresh. Import používá pouze veřejné RSS bez HTML scrapingu.
        </p>
      </header>

      <section className="rounded-2xl border border-[var(--abj-gold-dim)] bg-white p-5">
        <h2 className="text-lg font-semibold text-abj-text1">Přidat zdroj</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="font-medium text-abj-text1">Název zdroje</span>
            <input
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              className="w-full rounded-lg border border-[var(--abj-gold-dim)] px-3 py-2"
              placeholder="Např. Reuters"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-abj-text1">RSS URL</span>
            <input
              value={form.rssUrl}
              onChange={(event) => setForm((prev) => ({ ...prev, rssUrl: event.target.value }))}
              className="w-full rounded-lg border border-[var(--abj-gold-dim)] px-3 py-2"
              placeholder="https://..."
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-abj-text1">Web zdroje</span>
            <input
              value={form.homepageUrl}
              onChange={(event) => setForm((prev) => ({ ...prev, homepageUrl: event.target.value }))}
              className="w-full rounded-lg border border-[var(--abj-gold-dim)] px-3 py-2"
              placeholder="https://..."
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-abj-text1">Kategorie</span>
            <select
              value={form.categoryId}
              onChange={(event) => setForm((prev) => ({ ...prev, categoryId: event.target.value }))}
              className="w-full rounded-lg border border-[var(--abj-gold-dim)] px-3 py-2"
            >
              <option value="">Bez kategorie</option>
              {categoryOptions.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-abj-text1">Jazyk</span>
            <input
              value={form.language}
              onChange={(event) => setForm((prev) => ({ ...prev, language: event.target.value }))}
              className="w-full rounded-lg border border-[var(--abj-gold-dim)] px-3 py-2"
              placeholder="cs"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-abj-text1">Země</span>
            <input
              value={form.country}
              onChange={(event) => setForm((prev) => ({ ...prev, country: event.target.value }))}
              className="w-full rounded-lg border border-[var(--abj-gold-dim)] px-3 py-2"
              placeholder="CZ"
            />
          </label>
          <label className="space-y-1 text-sm md:col-span-2">
            <span className="font-medium text-abj-text1">Poznámka k právům obrázků</span>
            <input
              value={form.legalNote}
              onChange={(event) => setForm((prev) => ({ ...prev, legalNote: event.target.value }))}
              className="w-full rounded-lg border border-[var(--abj-gold-dim)] px-3 py-2"
              placeholder="Používat pouze obrázky s výslovným oprávněním."
            />
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-abj-text1 md:col-span-2">
            <input
              type="checkbox"
              checked={form.allowImages}
              onChange={(event) => setForm((prev) => ({ ...prev, allowImages: event.target.checked }))}
            />
            U tohoto zdroje povolit import obrázků (jen pokud je to právně bezpečné)
          </label>
        </div>

        <button
          type="button"
          disabled={submitting}
          onClick={() => {
            void createSource();
          }}
          className="mt-4 inline-flex min-h-11 items-center rounded-xl border border-[#FF6A00]/45 bg-[#FF6A00]/10 px-4 py-2 text-sm font-bold text-[#B04A00] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Ukládám..." : "Přidat zdroj"}
        </button>
      </section>

      {status ? <p className="text-sm text-[#2E6548]">{status}</p> : null}
      {error ? <p className="text-sm text-[#D14A2A]">{error}</p> : null}

      <section className="space-y-3">
        {loading ? (
          <p className="rounded-xl border border-[var(--abj-gold-dim)] bg-abj-panel px-4 py-4 text-sm text-abj-text2">
            Načítám zdroje...
          </p>
        ) : sources.length === 0 ? (
          <p className="rounded-xl border border-[var(--abj-gold-dim)] bg-abj-panel px-4 py-4 text-sm text-abj-text2">
            Zatím nejsou žádné zdroje.
          </p>
        ) : (
          sources.map((source) => (
            <article key={source.id} className="rounded-2xl border border-[var(--abj-gold-dim)] bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-abj-text1">{source.name}</h3>
                  <p className="text-xs text-abj-text2">{source.rss_url}</p>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${
                    source.is_active ? "bg-[rgba(74,126,97,0.14)] text-[#2E6548]" : "bg-[rgba(209,74,42,0.12)] text-[#B13A22]"
                  }`}
                >
                  {source.is_active ? "Aktivní" : "Vypnutý"}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-1 text-xs text-abj-text2 sm:grid-cols-2">
                <p>Slug: {source.slug}</p>
                <p>Poslední fetch: {formatDate(source.last_fetched_at)}</p>
                <p>Poslední úspěch: {formatDate(source.last_success_at)}</p>
                <p>Obrázky: {source.allow_images ? "Povoleny" : "Zakázány"}</p>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={pendingSourceId === source.id}
                  onClick={() => {
                    void refreshSource(source);
                  }}
                  className="rounded-lg border border-[#FF6A00]/35 bg-[#FF6A00]/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-[#B04A00] disabled:opacity-60"
                >
                  Ruční refresh
                </button>
                <button
                  type="button"
                  disabled={pendingSourceId === source.id}
                  onClick={() => {
                    void toggleSource(source);
                  }}
                  className="rounded-lg border border-[var(--abj-gold-dim)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-abj-text2 disabled:opacity-60"
                >
                  {source.is_active ? "Vypnout zdroj" : "Zapnout zdroj"}
                </button>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
