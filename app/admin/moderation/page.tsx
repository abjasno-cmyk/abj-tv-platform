"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type ModerationQuestion = {
  id: string;
  stream_id: string;
  user_id: string;
  content: string;
  status: "PENDING" | "ANSWERED" | "SENT_TO_YT";
  created_at: string;
  upvotes_count: number;
};

type PendingAction = "answer" | "overlay" | "youtube";

type QueuePayload = {
  stream: {
    id: string;
    title: string;
  };
  items: ModerationQuestion[];
};

async function callJson<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed (${response.status})`);
  }
  return (await response.json()) as T;
}

function formatCreatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";
  return new Intl.DateTimeFormat("cs-CZ", {
    timeZone: "Europe/Prague",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export default function ModerationPage() {
  const [streamTitle, setStreamTitle] = useState<string>("Moderation");
  const [items, setItems] = useState<ModerationQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [pendingActionById, setPendingActionById] = useState<Record<string, PendingAction>>({});

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setErrorText(null);
    try {
      const payload = await callJson<QueuePayload>("/api/hybrid-chat/moderation/queue");
      setStreamTitle(payload.stream.title || "Moderation");
      setItems(payload.items);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "Nelze načíst moderation queue.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  const pendingCount = useMemo(
    () => items.filter((item) => item.status === "PENDING").length,
    [items]
  );

  const runAction = useCallback(
    async (messageId: string, action: PendingAction) => {
      if (pendingActionById[messageId]) return;
      const endpoint =
        action === "answer"
          ? `/api/hybrid-chat/messages/${encodeURIComponent(messageId)}/answer`
          : action === "overlay"
            ? `/api/hybrid-chat/messages/${encodeURIComponent(messageId)}/send-to-overlay`
            : `/api/hybrid-chat/messages/${encodeURIComponent(messageId)}/send-to-youtube`;
      const label =
        action === "answer"
          ? "zodpovězení"
          : action === "overlay"
            ? "odeslání do obrazu"
            : "odeslání na YouTube";

      setPendingActionById((prev) => ({ ...prev, [messageId]: action }));
      setErrorText(null);
      try {
        await callJson(endpoint, { method: "POST" });
        await loadQueue();
      } catch (error) {
        setErrorText(error instanceof Error ? error.message : `Chyba při akci: ${label}.`);
      } finally {
        setPendingActionById((prev) => {
          const next = { ...prev };
          delete next[messageId];
          return next;
        });
      }
    },
    [loadQueue, pendingActionById]
  );

  return (
    <section className="mx-auto w-full max-w-5xl space-y-5 px-4 py-6">
      <header className="space-y-1">
        <p className="text-[11px] uppercase tracking-[0.14em] text-abj-text2">Admin</p>
        <h1 className="font-[var(--font-serif)] text-3xl font-semibold text-abj-text1">
          Moderation Queue
        </h1>
        <p className="text-sm text-abj-text2">
          Stream: {streamTitle} • Čeká {pendingCount} otázek
        </p>
      </header>

      {errorText ? (
        <div className="rounded-lg border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {errorText}
        </div>
      ) : null}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => {
            void loadQueue();
          }}
          className="rounded-md border border-white/15 bg-white/[0.03] px-3 py-1.5 text-xs uppercase tracking-[0.08em] text-abj-text2 hover:text-abj-text1"
        >
          Obnovit frontu
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }, (_, idx) => (
            <div
              key={`moderation-skeleton-${idx}`}
              className="h-28 animate-pulse rounded-xl border border-white/10 bg-white/[0.03]"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-[var(--abj-gold-dim)] bg-abj-panel p-5 text-sm text-abj-text2">
          Fronta je prázdná.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const pendingAction = pendingActionById[item.id];
            const disabled = Boolean(pendingAction);
            const pendingLabel =
              pendingAction === "answer"
                ? "zodpovězení"
                : pendingAction === "overlay"
                  ? "odeslání do obrazu"
                  : pendingAction === "youtube"
                    ? "odeslání na YouTube"
                    : null;
            return (
              <article
                key={item.id}
                className="rounded-xl border border-[var(--abj-gold-dim)] bg-abj-panel p-4"
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs text-abj-text2">
                    <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5">
                      ⬆ {item.upvotes_count}
                    </span>
                    <span>{formatCreatedAt(item.created_at)}</span>
                    <span className="rounded-full border border-white/10 px-2 py-0.5">
                      {item.status}
                    </span>
                  </div>
                  <span className="text-xs text-abj-text3">ID: {item.id.slice(0, 8)}</span>
                </div>

                <p className="text-sm leading-relaxed text-abj-text1">{item.content}</p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      void runAction(item.id, "answer");
                    }}
                    className="rounded-md border border-emerald-400/35 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    ✅ Zodpovězeno
                  </button>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      void runAction(item.id, "overlay");
                    }}
                    className="rounded-md border border-sky-400/35 bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-100 transition hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    📺 Do obrazu
                  </button>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      void runAction(item.id, "youtube");
                    }}
                    className="rounded-md border border-yellow-400/35 bg-yellow-500/10 px-3 py-1.5 text-xs font-semibold text-yellow-100 transition hover:bg-yellow-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    🤖 Poslat na YT
                  </button>
                  {pendingLabel ? (
                    <span className="self-center text-xs text-abj-text2">Probíhá {pendingLabel}…</span>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
