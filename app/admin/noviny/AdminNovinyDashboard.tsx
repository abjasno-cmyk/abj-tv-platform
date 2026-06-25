"use client";

import Link from "next/link";
import { useState } from "react";

type RefreshPayload = {
  report?: {
    totalSources: number;
    importedCount: number;
    deduplicatedCount: number;
    errorSources: number;
    warningSources: number;
  };
  error?: string;
};

export function AdminNovinyDashboard() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runRefresh = async () => {
    setLoading(true);
    setError(null);
    setStatus(null);
    try {
      const response = await fetch("/api/admin/noviny/refresh", {
        method: "POST",
        credentials: "include",
      });
      const payload = (await response.json().catch(() => ({}))) as RefreshPayload;
      if (!response.ok) {
        throw new Error(payload.error ?? "Refresh Novin selhal.");
      }
      const report = payload.report;
      setStatus(
        `Refresh dokončen. Zdroje: ${report?.totalSources ?? 0}, importováno: ${report?.importedCount ?? 0}, deduplikováno: ${report?.deduplicatedCount ?? 0}, chyby: ${report?.errorSources ?? 0}, varování: ${report?.warningSources ?? 0}.`,
      );
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Refresh Novin selhal.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      <header className="rounded-2xl border border-[var(--abj-gold-dim)] bg-abj-panel p-6">
        <p className="text-[11px] uppercase tracking-[0.14em] text-abj-text2">Admin · Noviny</p>
        <h1 className="mt-2 text-3xl font-semibold text-abj-text1">Správa sekce Noviny</h1>
        <p className="mt-2 text-sm text-abj-text2">
          Izolovaná administrace zdrojů a článků. Nezasahuje do živého vysílání, plánovače ani stávajícího CMS.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <Link
          href="/admin/noviny/zdroje"
          className="rounded-2xl border border-[var(--abj-gold-dim)] bg-white p-5 text-abj-text1 hover:border-[#FF6A00]/35"
        >
          <h2 className="text-xl font-semibold">Zdroje RSS</h2>
          <p className="mt-2 text-sm text-abj-text2">Přidání, vypnutí, ruční refresh a právní nastavení obrázků.</p>
        </Link>
        <Link
          href="/admin/noviny/clanky"
          className="rounded-2xl border border-[var(--abj-gold-dim)] bg-white p-5 text-abj-text1 hover:border-[#FF6A00]/35"
        >
          <h2 className="text-xl font-semibold">Články</h2>
          <p className="mt-2 text-sm text-abj-text2">Skrytí článku, úprava titulku/perexu a změna kategorie.</p>
        </Link>
      </section>

      <section className="rounded-2xl border border-[var(--abj-gold-dim)] bg-white p-5">
        <h2 className="text-lg font-semibold text-abj-text1">Ruční refresh všech aktivních zdrojů</h2>
        <p className="mt-1 text-sm text-abj-text2">
          Spustí RSS import pro všechny aktivní zdroje, provede deduplikaci podle canonical URL a uloží logy.
        </p>
        <button
          type="button"
          onClick={() => {
            void runRefresh();
          }}
          disabled={loading}
          className="mt-4 inline-flex min-h-11 items-center rounded-xl border border-[#FF6A00]/45 bg-[#FF6A00]/10 px-4 py-2 text-sm font-bold text-[#B04A00] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Probíhá refresh..." : "Spustit refresh"}
        </button>

        {status ? <p className="mt-3 text-sm text-[#2E6548]">{status}</p> : null}
        {error ? <p className="mt-3 text-sm text-[#D14A2A]">{error}</p> : null}
      </section>
    </div>
  );
}
