"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

import { useProgram } from "@/hooks/useProgram";

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
  breaking: "border-[#FF6A00] bg-[rgba(255,106,0,0.2)] text-[#FFE5D1]",
  today: "border-[#4F79B8] bg-[rgba(79,121,184,0.2)] text-[#D8E4F3]",
  week: "border-[rgba(154,163,178,0.5)] bg-[rgba(154,163,178,0.14)] text-[#D2D8E2]",
  evergreen: "border-[#4A7E61] bg-[rgba(74,126,97,0.2)] text-[#D5EBDD]",
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
    <div className="animate-pulse rounded-2xl border border-[var(--abj-gold-dim)] bg-abj-panel p-3">
      <div className="flex gap-3">
        <div className="h-[72px] w-[128px] rounded-lg bg-[rgba(154,163,178,0.2)]" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-24 rounded bg-[rgba(154,163,178,0.2)]" />
          <div className="h-5 w-[90%] rounded bg-[rgba(154,163,178,0.22)]" />
          <div className="h-3 w-[70%] rounded bg-[rgba(154,163,178,0.2)]" />
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
    <section className="mx-auto w-full max-w-4xl px-3 pb-6 pt-4 sm:px-5">
      <header className="sticky top-0 z-20 mb-4 rounded-xl border border-[var(--abj-gold-dim)] bg-[rgba(6,12,23,0.94)] px-4 py-3 backdrop-blur">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-[var(--font-serif)] text-xl font-semibold tracking-[0.08em] text-abj-gold">ABJ TV</p>
            <p className="mt-1 text-xs uppercase tracking-[0.14em] text-abj-text2">Program</p>
            <p className="text-xs text-abj-text2">{formatCurrentDate(clockNow)}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-[0.14em] text-abj-text2">Praha</p>
            <p className="font-mono text-2xl font-semibold leading-none text-abj-text1">{formatClock(clockNow)}</p>
          </div>
        </div>
      </header>
      {showDebugBadge && debugInfo?.upstreamUrl ? (
        <div className="mb-4 rounded-lg border border-[rgba(154,163,178,0.25)] bg-[rgba(6,12,23,0.76)] px-3 py-2 text-[10px] uppercase tracking-[0.06em] text-abj-text2">
          <p className="truncate">
            feed: <span className="text-abj-text1">{debugInfo.upstreamUrl}</span>
          </p>
          {debugInfo.upstreamTrace ? <p className="mt-1 truncate">{debugInfo.upstreamTrace}</p> : null}
        </div>
      ) : null}
      {stale ? (
        <div className="mb-4 rounded-lg border border-[rgba(217,195,122,0.35)] bg-[rgba(65,55,19,0.35)] px-3 py-2 text-xs text-[#E9DBA8]">
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
        <div className="rounded-2xl border border-[rgba(255,106,0,0.45)] bg-[rgba(40,20,10,0.56)] p-4">
          <p className="text-sm text-[#FFD7BE]">Načtení programu selhalo: {error}</p>
          <button
            type="button"
            className="mt-3 rounded-lg border border-[rgba(198,168,91,0.4)] bg-[rgba(198,168,91,0.16)] px-3 py-1.5 text-xs font-medium uppercase tracking-[0.08em] text-abj-text1"
            onClick={() => {
              setManualReloadTick((prev) => prev + 1);
              window.location.reload();
            }}
          >
            Zkusit znovu
          </button>
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-[var(--abj-gold-dim)] bg-abj-panel p-4 text-sm text-abj-text2">
          Program je momentálně prázdný.
        </div>
      ) : (
        <div className="space-y-3">
          {isRefreshing ? (
            <p className="text-right text-[11px] uppercase tracking-[0.08em] text-abj-text2">Aktualizuji…</p>
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
                className={`overflow-hidden rounded-2xl border bg-abj-panel transition-all duration-300 ${
                  active
                    ? "border-[#C6A85B] shadow-[0_0_0_1px_rgba(198,168,91,0.45),0_10px_24px_rgba(0,0,0,0.25)]"
                    : "border-[var(--abj-gold-dim)]"
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
                    <Image
                      src={thumb}
                      alt=""
                      className="h-[84px] w-[148px] flex-none rounded-lg border border-[rgba(255,255,255,0.08)] object-cover"
                      width={148}
                      height={84}
                      unoptimized
                    />

                    <div className="min-w-0 flex-1">
                      <div className="mb-1.5 flex flex-wrap items-center gap-2">
                        {active ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(255,106,0,0.25)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#FFE5D1]">
                            <span className="relative flex h-2.5 w-2.5 items-center justify-center">
                              <span className="absolute inline-flex h-2.5 w-2.5 animate-ping rounded-full bg-[#FF6A00]/70" />
                              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#FF6A00]" />
                            </span>
                            Teď běží
                          </span>
                        ) : null}

                        {urgency3 ? (
                          <span className="rounded-full bg-[#FF6A00] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-white">
                            BREAKING
                          </span>
                        ) : null}
                        {urgency2 ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#E1B064]">
                            <span className="h-2 w-2 rounded-full bg-[#E29A42]" />
                            Priorita
                          </span>
                        ) : null}

                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] ${FRESHNESS_CLASS[block.freshness]}`}
                        >
                          {block.freshness}
                        </span>
                      </div>

                      <p className="line-clamp-2 font-[var(--font-serif)] text-[19px] leading-[1.15] text-abj-text1 sm:text-[20px]">
                        {block.title}
                      </p>

                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-abj-text2">
                        <span>{dateTime.dateLabel}</span>
                        <span className="font-semibold text-abj-gold">
                          {dateTime.timeLabel} – {endTime}
                        </span>
                        <span>{formatDuration(block.durationMin)}</span>
                        <span className="truncate">{block.channel}</span>
                      </div>

                      {block.editorial.tldr ? (
                        <p className="mt-2 line-clamp-2 text-[14px] leading-snug text-[rgba(230,233,239,0.9)]">
                          {block.editorial.tldr}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </button>

                {active ? (
                  <div className="h-1 w-full bg-[rgba(198,168,91,0.12)]">
                    <div
                      className="h-full bg-[#C6A85B] transition-[width] duration-1000"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                ) : null}

                {expanded ? (
                  <div className="abj-expand-panel space-y-3 border-t border-[rgba(198,168,91,0.18)] bg-[rgba(7,17,30,0.8)] px-3 py-3 sm:px-4">
                    {block.videoId ? (
                      <div className="overflow-hidden rounded-xl border border-[rgba(198,168,91,0.2)] bg-black">
                        {!startedPlayback[block.id] ? (
                          <button
                            type="button"
                            className="abj-play-button group flex aspect-video w-full items-center justify-center bg-[radial-gradient(circle_at_center,rgba(198,168,91,0.28),rgba(0,0,0,0.8))] text-sm font-semibold text-abj-text1"
                            onClick={() => {
                              setStartedPlayback((prev) => ({ ...prev, [block.id]: true }));
                              void trackEditorialEvent(block.videoId!, "play");
                            }}
                          >
                            <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(198,168,91,0.38)] bg-[rgba(6,12,23,0.68)] px-4 py-2 transition-all duration-200 group-hover:border-[rgba(198,168,91,0.62)] group-hover:bg-[rgba(10,20,36,0.92)] group-active:scale-[0.98]">
                              <span className="inline-block h-2 w-2 rounded-full bg-[#C6A85B]" />
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

                    {context ? <p className="text-sm leading-relaxed text-abj-text2">{context}</p> : null}
                    {impact ? <p className="text-sm font-semibold text-abj-gold">{impact}</p> : null}

                    <div className="pt-1">
                      <button
                        type="button"
                        className="rounded-lg border border-[var(--abj-gold-dim)] px-3 py-1.5 text-xs uppercase tracking-[0.08em] text-abj-text2 hover:text-abj-text1"
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
