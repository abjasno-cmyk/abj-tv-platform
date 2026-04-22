"use client";

import { useMemo } from "react";

import { useFeed } from "@/hooks/useFeed";
import type { FeedPost } from "@/lib/api";

type FeedItem = {
  id: string;
  channel: string;
  headline: string;
  what: string;
  why: string | null;
  impact: string | null;
  freshness: "breaking" | "today" | "week" | "evergreen";
  urgency: 1 | 2 | 3;
  createdAt: string;
  videoId: string;
};

function toItems(posts: FeedPost[]): FeedItem[] {
  return posts
    .map((post) => ({
    id: post.id,
    channel: post.channel_name || "Neznámý kanál",
    headline: post.headline?.trim() || post.what?.trim() || "Bez titulku",
    what: post.what?.trim() || "",
    why: post.why?.trim() || null,
    impact: post.impact?.trim() || null,
    freshness: post.freshness,
    urgency: post.urgency,
    createdAt: post.created_at,
    videoId: post.video_id,
    }))
    .sort((a, b) => {
      const aTs = new Date(a.createdAt).getTime();
      const bTs = new Date(b.createdAt).getTime();
      if (!Number.isFinite(aTs) && !Number.isFinite(bTs)) return 0;
      if (!Number.isFinite(aTs)) return 1;
      if (!Number.isFinite(bTs)) return -1;
      return bTs - aTs;
    });
}

function freshnessClass(value: FeedItem["freshness"]): string {
  if (value === "breaking") return "border-[#A63A3A] bg-[rgba(166,58,58,0.2)] text-[#F3D8D8]";
  if (value === "today") return "border-[#4F79B8] bg-[rgba(79,121,184,0.2)] text-[#D8E4F3]";
  if (value === "week") return "border-[rgba(154,163,178,0.5)] bg-[rgba(154,163,178,0.14)] text-[#D2D8E2]";
  return "border-[#4A7E61] bg-[rgba(74,126,97,0.2)] text-[#D5EBDD]";
}

function formatCreatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "čas neuveden";
  return new Intl.DateTimeFormat("cs-CZ", {
    timeZone: "Europe/Prague",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function AbjXClient() {
  const { posts, loading, hasMore, loadMore } = useFeed();
  const items = useMemo(() => toItems(posts), [posts]);

  return (
    <section className="mx-auto w-full max-w-4xl space-y-6 px-3 py-6 sm:px-5">
      <header className="space-y-2">
        <p className="text-[11px] uppercase tracking-[0.14em] text-abj-text2">ABJ X</p>
        <h1 className="font-[var(--font-serif)] text-3xl font-semibold text-abj-text1">Textové zprávy</h1>
        <p className="text-sm text-abj-text2">Krátké zprávy a souvislosti napříč ABJ sítí</p>
      </header>

      {items.length === 0 && !loading ? (
        <div className="rounded-xl border border-[var(--abj-gold-dim)] bg-abj-panel p-6 text-sm text-abj-text2">
          Zatím žádné textové zprávy.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <article key={item.id} className="rounded-xl border border-[var(--abj-gold-dim)] bg-abj-panel p-3 sm:p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                {item.urgency >= 3 ? (
                  <span className="rounded-full bg-[#B23B3B] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-white">
                    BREAKING
                  </span>
                ) : null}
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] ${freshnessClass(item.freshness)}`}
                >
                  {item.freshness}
                </span>
                <span className="text-[11px] uppercase tracking-[0.08em] text-abj-text2">{item.channel}</span>
                <span className="text-[11px] text-abj-text2">{formatCreatedAt(item.createdAt)}</span>
              </div>

              <h2 className="text-base font-semibold text-abj-text1 sm:text-lg">{item.headline}</h2>
              <p className="mt-1 text-sm text-abj-text1">{item.what}</p>
              {item.why ? <p className="mt-1 text-sm text-abj-text2">{item.why}</p> : null}
              {item.impact ? <p className="mt-1 text-sm font-medium text-abj-gold">{item.impact}</p> : null}
            </article>
          ))}
        </div>
      )}

      {hasMore ? (
        <div className="flex justify-center">
          <button
            type="button"
            className="rounded-lg border border-[var(--abj-gold-dim)] bg-abj-panel px-4 py-2 text-xs uppercase tracking-[0.08em] text-abj-text2 hover:text-abj-text1"
            onClick={() => {
              void loadMore();
            }}
          >
            {loading ? "Načítám..." : "Načíst další"}
          </button>
        </div>
      ) : null}
    </section>
  );
}
