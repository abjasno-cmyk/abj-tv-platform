"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

import { useProgram } from "@/hooks/useProgram";
import { SectionLabel } from "@/components/abj/SectionLabel";

type Freshness = "breaking" | "today" | "week" | "evergreen";

type ProgramBlockView = {
  id: string;
  startsAt: string;
  endsAt: string;
  title: string;
  channel: string;
  videoId: string | null;
  thumbnail: string | null;
  durationMin: number;
  urgency: number;
  freshness: Freshness;
  editorial: {
    tldr: string | null;
    context: string | null;
    impact: string | null;
  };
};

type ProgramFeedView = {
  blocks: ProgramBlockView[];
  validUntil: string | null;
};

type ProgramDebugInfo = {
  upstreamUrl: string | null;
  upstreamTrace: string | null;
};

const PRAGUE_TIMEZONE = "Europe/Prague";
const REFRESH_EVERY_MS = 5 * 60 * 1000;

const FRESHNESS_CLASS: Record<Freshness, string> = {
  breaking: "border-verox-orange bg-verox-orange/12 text-verox-orangeText",
  today: "border-verox-line bg-verox-paperDeep text-verox-charcoal",
  week: "border-verox-line bg-white text-verox-gray",
  evergreen: "border-verox-line bg-verox-paper text-verox-gray",
};

function isObjectLike(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function parseDateMs(value: string | null): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function normalizeFreshness(value: unknown): Freshness {
  const raw = readString(value)?.toLowerCase();
  if (raw === "breaking" || raw === "today" || raw === "week" || raw === "evergreen") return raw;
  return "evergreen";
}

function toPragueDateTime(iso: string): { dateLabel: string; timeLabel: string } {
  const date = new Date(iso);
  return {
    dateLabel: new Intl.DateTimeFormat("cs-CZ", {
      timeZone: PRAGUE_TIMEZONE,
      weekday: "short",
      day: "numeric",
      month: "numeric",
    }).format(date),
    timeLabel: new Intl.DateTimeFormat("cs-CZ", {
      timeZone: PRAGUE_TIMEZONE,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date),
  };
}

function formatClock(now: Date): string {
  return new Intl.DateTimeFormat("cs-CZ", {
    timeZone: PRAGUE_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(now);
}

function formatCurrentDate(now: Date): string {
  return new Intl.DateTimeFormat("cs-CZ", {
    timeZone: PRAGUE_TIMEZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);
}

function formatDuration(durationMin: number): string {
  if (!Number.isFinite(durationMin) || durationMin <= 0) return "0 min";
  if (durationMin < 60) return `${durationMin} min`;
  const hours = Math.floor(durationMin / 60);
  const minutes = durationMin % 60;
  if (minutes === 0) return `${hours} h`;
  return `${hours} h ${minutes} min`;
}

function normalizeProgramPayload(raw: unknown): ProgramFeedView {
  const payload = isObjectLike(raw) ? raw : {};
  const rawBlocks = Array.isArray(payload.blocks)
    ? payload.blocks
    : Array.isArray(payload.timeline)
      ? payload.timeline
      : Array.isArray(raw)
        ? raw
        : [];

  const blocks: ProgramBlockView[] = [];

  for (const row of rawBlocks) {
    if (!isObjectLike(row)) continue;

    const startsAt = readString(row.starts_at) ?? readString(row.start) ?? readString(row.startIso);
    const endsAt = readString(row.ends_at) ?? readString(row.end) ?? readString(row.endIso);
    const title = readString(row.title);
    if (!startsAt || !endsAt || !title) continue;

    const startMs = parseDateMs(startsAt);
    const endMs = parseDateMs(endsAt);
    if (startMs === null || endMs === null || endMs <= startMs) continue;

    const durationMin = Math.max(1, Math.round((endMs - startMs) / 60_000));
    const editorialObj = isObjectLike(row.editorial) ? row.editorial : {};
    const freshness = normalizeFreshness(editorialObj.freshness ?? row.freshness);
    const urgency = Math.max(0, Math.round(readNumber(editorialObj.urgency ?? row.urgency) ?? 0));

    blocks.push({
      id: readString(row.block_id) ?? readString(row.id) ?? `${startsAt}-${title}`,
      startsAt,
      endsAt,
      title,
      channel: readString(row.channel) ?? readString(row.channel_name) ?? "ABJ TV",
      videoId: readString(row.video_id) ?? readString(row.videoId),
      thumbnail:
        readString(row.thumbnail) ??
        readString(row.thumbnail_url) ??
        readString(row.thumbnailUrl) ??
        readString(row.image_url),
      durationMin,
      urgency,
      freshness,
      editorial: {
        tldr: readString(editorialObj.tldr) ?? readString(row.tldr),
        context: readString(editorialObj.context) ?? readString(row.context),
        impact: readString(editorialObj.impact) ?? readString(row.impact),
      },
    });
  }

  blocks.sort((a, b) => (parseDateMs(a.startsAt) ?? 0) - (parseDateMs(b.startsAt) ?? 0));

  return {
    blocks,
    validUntil: readString(payload.valid_until) ?? readString(payload.validUntil),
  };
}

function mapApiProgramToView(program: ReturnType<typeof useProgram>["program"]): ProgramFeedView {
  if (!program) return { blocks: [], validUntil: null };
  return normalizeProgramPayload(program);
}

async function trackEditorialEvent(videoId: string, eventType: "expand" | "play" | "skip") {
  try {
    await fetch("/editorial/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        video_id: videoId,
        event_type: eventType,
      }),
      keepalive: true,
    });
  } catch {
    // Tracking failures are intentionally ignored.
  }
}

function ProgramRowSkeleton() {
  return (
    <div className="animate-pulse rounded-[14px] border border-verox-line bg-white p-3 shadow-[0_8px_18px_rgba(17,17,17,0.10)]">
      <div className="flex gap-3">
        <div className="aspect-video h-[84px] w-[148px] flex-none rounded-[10px] bg-verox-paperDeep" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-24 rounded bg-verox-paperDeep" />
          <div className="h-5 w-[90%] rounded bg-verox-paperDeep" />
          <div className="h-3 w-[70%] rounded bg-verox-paperDeep" />
        </div>
      </div>
    </div>
  );
}

export default function ProgramPage() {
  const { program, loading: hookLoading, stale } = useProgram();
  const [debugInfo, setDebugInfo] = useState<ProgramDebugInfo | null>(null);
  const [manualReloadTick, setManualReloadTick] = useState(0);
  const [clockNow, setClockNow] = useState(() => new Date());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [startedPlayback, setStartedPlayback] = useState<Record<string, boolean>>({});
  const itemRefs = useRef<Record<string, HTMLElement | null>>({});
  const skipTracked = useRef<Set<string>>(new Set());
  const lastAutoScrolledBlockId = useRef<string | null>(null);
  const feed = useMemo(() => mapApiProgramToView(program), [program]);
  const rows = useMemo(() => feed.blocks ?? [], [feed.blocks]);
  const isLoading = hookLoading && rows.length === 0;
  const error = !hookLoading && rows.length === 0 ? "Replit program feed je prázdný nebo nedostupný." : null;
  const isRefreshing = stale || manualReloadTick > 0;

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClockNow(new Date());
    }, 1_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (manualReloadTick <= 0) return;
    const timer = window.setTimeout(() => setManualReloadTick(0), 1500);
    return () => window.clearTimeout(timer);
  }, [manualReloadTick]);

  useEffect(() => {
    if (!expandedId) return;
    const block = rows.find((item) => item.id === expandedId);
    if (!block?.videoId) return;
    const skipKey = `${block.videoId}:skip`;
    if (skipTracked.current.has(skipKey)) return;

    const timer = window.setTimeout(() => {
      const rowElement = itemRefs.current[expandedId];
      if (!rowElement) return;
      const rect = rowElement.getBoundingClientRect();
      const viewHeight = window.innerHeight || document.documentElement.clientHeight;
      const outOfView = rect.bottom < 0 || rect.top > viewHeight;
      if (outOfView && !skipTracked.current.has(skipKey)) {
        skipTracked.current.add(skipKey);
        void trackEditorialEvent(block.videoId!, "skip");
      }
    }, 3_000);

    return () => window.clearTimeout(timer);
  }, [expandedId, rows]);

  const nowMs = clockNow.getTime();
  const showDebugBadge = process.env.NODE_ENV !== "production";
  const currentBlockId = useMemo(() => {
    for (const block of rows) {
      const start = parseDateMs(block.startsAt);
      const end = parseDateMs(block.endsAt);
      if (start === null || end === null) continue;
      if (nowMs >= start && nowMs < end) return block.id;
    }
    return null;
  }, [nowMs, rows]);
  const scrollTargetBlockId = useMemo(() => {
    if (currentBlockId) return currentBlockId;
    const firstUpcoming = rows.find((block) => {
      const start = parseDateMs(block.startsAt);
      return start !== null && start > nowMs;
    });
    if (firstUpcoming) return firstUpcoming.id;
    return rows[rows.length - 1]?.id ?? null;
  }, [currentBlockId, nowMs, rows]);

  useEffect(() => {
    if (!scrollTargetBlockId) return;
    if (lastAutoScrolledBlockId.current === scrollTargetBlockId) return;
    const target = itemRefs.current[scrollTargetBlockId];
    if (!target) return;

    const stickyOffset = 132;
    const top = window.scrollY + target.getBoundingClientRect().top - stickyOffset;
    window.scrollTo({
      top: Math.max(0, top),
      behavior: lastAutoScrolledBlockId.current ? "smooth" : "auto",
    });
    lastAutoScrolledBlockId.current = scrollTargetBlockId;
  }, [scrollTargetBlockId]);

  return (
    <section className="mx-auto w-full max-w-4xl bg-[#FBF8F2] px-3 pb-6 pt-4 text-verox-ink sm:px-5">
      <header className="sticky top-0 z-20 mb-5 rounded-[14px] border border-verox-line bg-white/95 px-4 py-3.5 shadow-[0_8px_18px_rgba(17,17,17,0.10)] backdrop-blur">
        <div className="flex items-start justify-between gap-4">
          <div>
            <SectionLabel index="(05)" title="Program" kicker="Vysílání" />
            <p className="mt-2 vx-meta">{formatCurrentDate(clockNow)}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="vx-kicker">Praha</p>
            <p className="vx-clock mt-1 text-2xl leading-none">{formatClock(clockNow)}</p>
          </div>
        </div>
      </header>
      {showDebugBadge && debugInfo?.upstreamUrl ? (
        <div className="mb-4 rounded-[10px] border border-verox-line bg-white px-3 py-2 vx-meta">
          <p className="truncate">
            feed: <span className="text-verox-ink">{debugInfo.upstreamUrl}</span>
          </p>
          {debugInfo.upstreamTrace ? <p className="mt-1 truncate">{debugInfo.upstreamTrace}</p> : null}
        </div>
      ) : null}
      {stale ? (
        <div className="mb-4 rounded-[10px] border-l-2 border-verox-orange bg-verox-paperDeep px-3 py-2 text-xs text-verox-charcoal">
          Feed je stale (po `stale_after`). Zvaž kontrolu Replit `/health`.
        </div>
      ) : null}

      {isLoading ? (
        <div className="space-y-3">
          <ProgramRowSkeleton />
          <ProgramRowSkeleton />
          <ProgramRowSkeleton />
          <ProgramRowSkeleton />
        </div>
      ) : error ? (
        <div className="rounded-[14px] border-l-2 border-verox-orange bg-white p-4 shadow-[0_8px_18px_rgba(17,17,17,0.10)]">
          <p className="text-sm text-verox-charcoal">Načtení programu selhalo: {error}</p>
          <button
            type="button"
            className="vx-btn vx-btn--sm mt-3"
            onClick={() => {
              setManualReloadTick((prev) => prev + 1);
              window.location.reload();
            }}
          >
            Zkusit znovu
          </button>
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-[14px] border border-verox-line bg-white p-4 text-sm text-verox-gray shadow-[0_8px_18px_rgba(17,17,17,0.10)]">
          Program je momentálně prázdný.
        </div>
      ) : (
        <div className="space-y-3">
          {isRefreshing ? (
            <p className="flex items-center justify-end gap-2 vx-meta">
              <span className="vx-live-dot" />
              Aktualizuji…
            </p>
          ) : null}

          {rows.map((block) => {
            const startMs = parseDateMs(block.startsAt) ?? 0;
            const endMs = parseDateMs(block.endsAt) ?? 0;
            const active = currentBlockId === block.id;
            const progressPct =
              active && endMs > startMs
                ? Math.max(0, Math.min(100, ((nowMs - startMs) / (endMs - startMs)) * 100))
                : 0;
            const expanded = expandedId === block.id;
            const dateTime = toPragueDateTime(block.startsAt);
            const endTime = toPragueDateTime(block.endsAt).timeLabel;
            const thumb = block.thumbnail ?? "https://i.ytimg.com/vi/0/hqdefault.jpg";
            const urgency3 = block.urgency >= 3;
            const urgency2 = !urgency3 && block.urgency >= 2;
            const context = block.editorial.context;
            const impact = block.editorial.impact;

            return (
              <article
                key={block.id}
                ref={(node) => {
                  itemRefs.current[block.id] = node;
                }}
                className={`overflow-hidden rounded-[14px] border bg-white transition-all duration-300 ${
                  active
                    ? "border-verox-orange shadow-[0_0_0_1px_rgba(243,112,33,0.45),0_16px_30px_rgba(17,17,17,0.16)]"
                    : "border-verox-line shadow-[0_8px_18px_rgba(17,17,17,0.10)]"
                }`}
              >
                <button
                  type="button"
                  className="w-full px-3 py-3.5 text-left sm:px-4"
                  onClick={() => {
                    const nextExpanded = expanded ? null : block.id;
                    setExpandedId(nextExpanded);
                    if (nextExpanded && block.videoId) {
                      void trackEditorialEvent(block.videoId, "expand");
                    }
                  }}
                >
                  <div className="flex gap-4">
                    <div className="relative aspect-video h-[84px] w-[148px] flex-none overflow-hidden rounded-[10px] bg-verox-ink">
                      <Image
                        src={thumb}
                        alt=""
                        className="h-full w-full object-cover"
                        width={148}
                        height={84}
                        unoptimized
                      />
                      <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                      {active ? <span className="pointer-events-none absolute inset-0 bg-verox-orange/40" /> : null}
                      <span className="absolute inset-0 grid place-items-center">
                        <span className="grid h-9 w-9 place-items-center rounded-full bg-verox-orange text-white shadow-[0_8px_18px_-6px_rgba(216,91,18,0.9)]">
                          <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="translate-x-[1px]">
                            <path d="M8 5.5v13a1 1 0 001.52.85l10-6.5a1 1 0 000-1.7l-10-6.5A1 1 0 008 5.5z" />
                          </svg>
                        </span>
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="mb-1.5 flex flex-wrap items-center gap-2">
                        {active ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-verox-orange/14 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-verox-orangeText">
                            <span className="vx-live-dot" />
                            Teď běží
                          </span>
                        ) : null}

                        {urgency3 ? (
                          <span className="vx-badge" style={{ fontSize: "0.58rem", padding: "0.22rem 0.5rem" }}>
                            BREAKING
                          </span>
                        ) : null}
                        {urgency2 ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-verox-orangeText">
                            <span className="h-2 w-2 rounded-full bg-verox-orange" />
                            Priorita
                          </span>
                        ) : null}

                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] ${FRESHNESS_CLASS[block.freshness]}`}
                        >
                          {block.freshness}
                        </span>
                      </div>

                      <p className="vx-display line-clamp-2 text-verox-ink" style={{ fontSize: "1.18rem", lineHeight: 1.12 }}>
                        {block.title}
                      </p>

                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 vx-meta">
                        <span>{dateTime.dateLabel}</span>
                        <span className="font-semibold text-verox-orangeText">
                          {dateTime.timeLabel} – {endTime}
                        </span>
                        <span>{formatDuration(block.durationMin)}</span>
                        <span className="truncate">{block.channel}</span>
                      </div>

                      {block.editorial.tldr ? (
                        <p className="mt-2 line-clamp-2 text-[14px] leading-snug text-verox-charcoal">
                          {block.editorial.tldr}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </button>

                {active ? (
                  <div className="h-1 w-full bg-verox-orange/12">
                    <div
                      className="h-full bg-verox-orange transition-[width] duration-1000"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                ) : null}

                {expanded ? (
                  <div className="abj-expand-panel space-y-3 border-t border-verox-line bg-verox-paper px-3 py-3 sm:px-4">
                    {block.videoId ? (
                      <div className="overflow-hidden rounded-[10px] border border-verox-line bg-verox-ink">
                        {!startedPlayback[block.id] ? (
                          <button
                            type="button"
                            className="abj-play-button group flex aspect-video w-full items-center justify-center bg-[radial-gradient(circle_at_center,rgba(243,112,33,0.22),rgba(23,20,17,0.92))] text-sm font-semibold text-white"
                            onClick={() => {
                              setStartedPlayback((prev) => ({ ...prev, [block.id]: true }));
                              void trackEditorialEvent(block.videoId!, "play");
                            }}
                          >
                            <span className="inline-flex items-center gap-2 rounded-full bg-verox-orange px-4 py-2 text-white shadow-[0_10px_24px_-8px_rgba(216,91,18,0.9)] transition-all duration-200 group-hover:bg-verox-orangeDeep group-active:scale-[0.98]">
                              <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="translate-x-[1px]">
                                <path d="M8 5.5v13a1 1 0 001.52.85l10-6.5a1 1 0 000-1.7l-10-6.5A1 1 0 008 5.5z" />
                              </svg>
                              Přehrát video
                            </span>
                          </button>
                        ) : (
                          <iframe
                            title={block.title}
                            className="aspect-video w-full"
                            src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(block.videoId)}?rel=0&modestbranding=1&playsinline=1&autoplay=1&iv_load_policy=3&disablekb=1&fs=0&loop=1&playlist=${encodeURIComponent(block.videoId)}`}
                            allow="autoplay; encrypted-media; picture-in-picture"
                            sandbox="allow-scripts allow-same-origin allow-presentation"
                            referrerPolicy="origin"
                            allowFullScreen
                          />
                        )}
                      </div>
                    ) : null}

                    {context ? <p className="text-sm leading-relaxed text-verox-charcoal">{context}</p> : null}
                    {impact ? <p className="text-sm font-semibold text-verox-orangeText">{impact}</p> : null}

                    <div className="pt-1">
                      <button
                        type="button"
                        className="vx-btn vx-btn--sm vx-btn--ghost-ink"
                        onClick={() => setExpandedId(null)}
                      >
                        Zavřít
                      </button>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
