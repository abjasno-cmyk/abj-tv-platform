"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { SourceAdminRow, SourcePriority } from "@/lib/studio/sourcesAdmin";

type SourcesSummary = {
  total: number;
  active: number;
  needsAttention: number;
};

type FilterMode = "all" | "active" | "issues";

const PRIORITIES: SourcePriority[] = ["A", "B", "C"];

const EMPTY_FORM = {
  sourceName: "",
  channelUrl: "",
  priority: "B" as SourcePriority,
  category: "",
  notes: "",
};

function priorityLabel(priority: SourcePriority): string {
  if (priority === "A") return "A — hlavní";
  if (priority === "B") return "B — standard";
  return "C — podpůrný";
}

export function SourcesAdminBoard() {
  const [sources, setSources] = useState<SourceAdminRow[]>([]);
  const [summary, setSummary] = useState<SourcesSummary>({ total: 0, active: 0, needsAttention: 0 });
  const [filterMode, setFilterMode] = useState<FilterMode>("active");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/studio/sources", { cache: "no-store" });
      const payload = (await response.json().catch(() => ({}))) as {
        sources?: SourceAdminRow[];
        summary?: SourcesSummary;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Načtení kanálů selhalo.");
      }
      setSources(payload.sources ?? []);
      if (payload.summary) setSummary(payload.summary);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Načtení kanálů selhalo.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleSources = useMemo(() => {
    if (filterMode === "issues") {
      return sources.filter((row) => row.active && row.needsAttention);
    }
    if (filterMode === "active") {
      return sources.filter((row) => row.active);
    }
    return sources;
  }, [filterMode, sources]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
  };

  const handleCreate = async () => {
    setSaving(true);
    setError(null);
    setStatusMessage(null);
    try {
      const response = await fetch("/api/studio/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceName: form.sourceName,
          channelUrl: form.channelUrl,
          priority: form.priority,
          category: form.category || null,
          notes: form.notes || null,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { source?: SourceAdminRow; error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Vytvoření kanálu selhalo.");
      }

      if (payload.source) {
        setSources((current) => [...current, payload.source!].sort((a, b) => a.sourceName.localeCompare(b.sourceName, "cs-CZ")));
        setStatusMessage(`Kanál „${payload.source.sourceName}" byl přidán. Klikněte na „Sync ID" pro stažení YouTube identifikátorů.`);
        resetForm();
        void load();
      }
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Vytvoření kanálu selhalo.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (sourceId: string, patch: Record<string, unknown>) => {
    setSaving(true);
    setError(null);
    setStatusMessage(null);
    try {
      const response = await fetch(`/api/studio/sources/${sourceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const payload = (await response.json().catch(() => ({}))) as { source?: SourceAdminRow; error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Aktualizace kanálu selhala.");
      }
      if (payload.source) {
        setSources((current) =>
          current.map((row) => (row.id === sourceId ? payload.source! : row)).sort((a, b) => a.sourceName.localeCompare(b.sourceName, "cs-CZ")),
        );
        setStatusMessage(`Kanál „${payload.source.sourceName}" byl aktualizován.`);
      }
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Aktualizace kanálu selhala.");
    } finally {
      setSaving(false);
    }
  };

  const handleSyncIds = async (sourceId: string) => {
    setSyncingId(sourceId);
    setError(null);
    setStatusMessage(null);
    try {
      const response = await fetch(`/api/studio/sources/${sourceId}/sync-ids`, { method: "POST" });
      const payload = (await response.json().catch(() => ({}))) as {
        status?: string;
        message?: string;
        channelId?: string;
        uploadsPlaylistId?: string;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Synchronizace ID selhala.");
      }
      if (payload.status === "updated" || payload.status === "unchanged") {
        setSources((current) =>
          current.map((row) =>
            row.id === sourceId
              ? {
                  ...row,
                  channelId: payload.channelId ?? row.channelId,
                  uploadsPlaylistId: payload.uploadsPlaylistId ?? row.uploadsPlaylistId,
                  needsAttention: !(payload.channelId && payload.uploadsPlaylistId),
                }
              : row,
          ),
        );
        setStatusMessage(
          payload.status === "updated"
            ? `YouTube ID synchronizováno (${payload.message ?? "OK"}). Videa se začnou stahovat do 15 minut.`
            : "YouTube ID už bylo aktuální.",
        );
      }
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "Synchronizace ID selhala.");
    } finally {
      setSyncingId(null);
    }
  };

  const startEdit = (row: SourceAdminRow) => {
    setEditingId(row.id);
    setShowForm(true);
    setForm({
      sourceName: row.sourceName,
      channelUrl: row.channelUrl,
      priority: row.priority,
      category: row.category ?? "",
      notes: row.notes ?? "",
    });
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[#2f3647] bg-[#0f131b] p-5 shadow-[0_20px_45px_rgba(0,0,0,0.35)]">
        <p className="text-xs uppercase tracking-[0.18em] text-[#ff6a00]">VEROX Studio</p>
        <h1 className="mt-2 text-2xl font-semibold text-white md:text-3xl">Správa kanálů</h1>
        <p className="mt-2 max-w-3xl text-sm text-[#b7c1d3]">
          Přidávejte nové YouTube kanály bez ručního SQL. Existující kanály (Echo, Angelika Bazalová, …) se nemění —
          přidáváte jen nové řádky. Po uložení klikněte na „Sync ID"; cron pak automaticky stahuje videa.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
          <p className="rounded-lg border border-[#2f3647] bg-[#0c1018] px-3 py-2">Celkem: {summary.total}</p>
          <p className="rounded-lg border border-[#3f5f4f] bg-[#142017] px-3 py-2 text-[#b4efc5]">Aktivní: {summary.active}</p>
          <p className="rounded-lg border border-[#7a3d2b] bg-[#2a1814] px-3 py-2 text-[#ffcebd]">
            Čeká na ID: {summary.needsAttention}
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-[#2f3647] bg-[#0f131b] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {(
              [
                { key: "active", label: "Aktivní" },
                { key: "issues", label: "Chybí ID" },
                { key: "all", label: "Vše" },
              ] as const
            ).map((filter) => {
              const active = filter.key === filterMode;
              return (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setFilterMode(filter.key)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] ${
                    active
                      ? "border-[#ff6a00] bg-[rgba(255,106,0,0.12)] text-[#ff6a00]"
                      : "border-[#2f3647] text-[#9fb0cc]"
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
              className="rounded-lg border border-[#2f3647] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-[#9fb0cc]"
            >
              Obnovit
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              if (showForm && !editingId) {
                resetForm();
              } else {
                setEditingId(null);
                setForm(EMPTY_FORM);
                setShowForm(true);
              }
            }}
            className="rounded-lg border border-[#ff6a00] bg-[#ff6a00] px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white hover:bg-[#e95f00]"
          >
            {showForm && !editingId ? "Zrušit" : "+ Přidat kanál"}
          </button>
        </div>

        {error ? <p className="mt-3 text-sm text-[#ff9b9b]">{error}</p> : null}
        {statusMessage ? <p className="mt-3 text-sm text-[#b4efc5]">{statusMessage}</p> : null}

        {showForm ? (
          <div className="mt-4 rounded-xl border border-[#2f3647] bg-[#0c1018] p-4">
            <h2 className="text-sm font-semibold text-white">{editingId ? "Upravit kanál" : "Nový kanál"}</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <label className="space-y-1 text-xs text-[#b7c1d3]">
                Název kanálu
                <input
                  value={form.sourceName}
                  onChange={(event) => setForm((current) => ({ ...current, sourceName: event.target.value }))}
                  className="mt-1 w-full rounded-md border border-[#30384a] bg-[#101625] px-3 py-2 text-sm text-[#edf2fb] outline-none focus:border-[#ff6a00]"
                  placeholder="Echo Podcasty"
                />
              </label>
              <label className="space-y-1 text-xs text-[#b7c1d3]">
                YouTube URL
                <input
                  value={form.channelUrl}
                  onChange={(event) => setForm((current) => ({ ...current, channelUrl: event.target.value }))}
                  className="mt-1 w-full rounded-md border border-[#30384a] bg-[#101625] px-3 py-2 text-sm text-[#edf2fb] outline-none focus:border-[#ff6a00]"
                  placeholder="https://www.youtube.com/@handle"
                />
              </label>
              <label className="space-y-1 text-xs text-[#b7c1d3]">
                Priorita
                <select
                  value={form.priority}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, priority: event.target.value as SourcePriority }))
                  }
                  className="mt-1 w-full rounded-md border border-[#30384a] bg-[#101625] px-3 py-2 text-sm text-[#edf2fb] outline-none focus:border-[#ff6a00]"
                >
                  {PRIORITIES.map((priority) => (
                    <option key={priority} value={priority}>
                      {priorityLabel(priority)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-xs text-[#b7c1d3]">
                Kategorie (volitelné)
                <input
                  value={form.category}
                  onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                  className="mt-1 w-full rounded-md border border-[#30384a] bg-[#101625] px-3 py-2 text-sm text-[#edf2fb] outline-none focus:border-[#ff6a00]"
                  placeholder="komentář"
                />
              </label>
              <label className="space-y-1 text-xs text-[#b7c1d3] md:col-span-2">
                Poznámka (volitelné)
                <input
                  value={form.notes}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                  className="mt-1 w-full rounded-md border border-[#30384a] bg-[#101625] px-3 py-2 text-sm text-[#edf2fb] outline-none focus:border-[#ff6a00]"
                />
              </label>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  if (editingId) {
                    void handleUpdate(editingId, {
                      sourceName: form.sourceName,
                      channelUrl: form.channelUrl,
                      priority: form.priority,
                      category: form.category || null,
                      notes: form.notes || null,
                    });
                  } else {
                    void handleCreate();
                  }
                }}
                className="rounded-md border border-[#ff6a00] bg-[#ff6a00] px-4 py-2 text-sm font-semibold text-white hover:bg-[#e95f00] disabled:opacity-60"
              >
                {saving ? "Ukládám…" : editingId ? "Uložit změny" : "Přidat kanál"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="rounded-md border border-[#2f3647] px-4 py-2 text-sm text-[#b7c1d3]"
              >
                Zrušit
              </button>
            </div>
          </div>
        ) : null}
      </section>

      {loading ? (
        <p className="rounded-xl border border-[#2f3647] bg-[#0f131b] px-4 py-4 text-sm text-[#b7c1d3]">Načítám kanály…</p>
      ) : visibleSources.length === 0 ? (
        <p className="rounded-xl border border-[#2f3647] bg-[#0f131b] px-4 py-4 text-sm text-[#b7c1d3]">
          Pro tento filtr nejsou žádné kanály.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[#2f3647] bg-[#0f131b]">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[#2f3647] text-xs uppercase tracking-[0.08em] text-[#9fb0cc]">
              <tr>
                <th className="px-4 py-3">Kanál</th>
                <th className="px-4 py-3">Priorita</th>
                <th className="px-4 py-3">Stav</th>
                <th className="px-4 py-3">channel_id</th>
                <th className="px-4 py-3">Akce</th>
              </tr>
            </thead>
            <tbody>
              {visibleSources.map((row) => (
                <tr key={row.id} className="border-b border-[#1a2130] align-top">
                  <td className="px-4 py-3">
                    <p className="font-medium text-[#e6ecf9]">{row.sourceName}</p>
                    <a
                      href={row.channelUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 block max-w-xs truncate text-xs text-[#9fb0cc] underline hover:text-[#ff6a00]"
                    >
                      {row.channelUrl}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-[#b7c1d3]">{row.priority}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${
                        !row.active
                          ? "bg-[#2a2f3a] text-[#9fb0cc]"
                          : row.needsAttention
                            ? "bg-[rgba(209,74,42,0.15)] text-[#ff9b9b]"
                            : "bg-[rgba(74,126,97,0.15)] text-[#b4efc5]"
                      }`}
                    >
                      {!row.active ? "Neaktivní" : row.needsAttention ? "Chybí ID" : "OK"}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[#9fb0cc]">{row.channelId ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(row)}
                        className="rounded border border-[#2f3647] px-2 py-1 text-xs text-[#b7c1d3] hover:border-[#ff6a00]"
                      >
                        Upravit
                      </button>
                      <button
                        type="button"
                        disabled={syncingId === row.id}
                        onClick={() => {
                          void handleSyncIds(row.id);
                        }}
                        className="rounded border border-[#2f3647] px-2 py-1 text-xs text-[#b7c1d3] hover:border-[#ff6a00] disabled:opacity-60"
                      >
                        {syncingId === row.id ? "Sync…" : "Sync ID"}
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => {
                          void handleUpdate(row.id, { active: !row.active });
                        }}
                        className="rounded border border-[#2f3647] px-2 py-1 text-xs text-[#b7c1d3] hover:border-[#ff6a00] disabled:opacity-60"
                      >
                        {row.active ? "Deaktivovat" : "Aktivovat"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
