import Link from "next/link";
import Image from "next/image";

import { buildPlaylist } from "@/lib/buildPlaylist";
import { getProgram } from "@/lib/programEngine";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CachedVideo, ProgramBlock } from "@/lib/epg-types";

export const dynamic = "force-dynamic";

const BLOCK_TYPE_LABELS: Record<ProgramBlock["type"], string> = {
  live: "Živě",
  premiere: "Premiéra",
  recorded: "Záznam",
  coming_up: "Za chvíli",
  fixed_abj: "ABJ blok",
  ceremonial: "Ceremoniál",
};

function formatPragueTime(iso: string): string {
  return new Intl.DateTimeFormat("cs-CZ", {
    timeZone: "Europe/Prague",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

async function loadFeedVideos(): Promise<CachedVideo[]> {
  const supabase = await createSupabaseServerClient();

  const canonical = await supabase
    .from("videos")
    .select(
      "id, source_id, channel_id, video_id, title, thumbnail, published_at, scheduled_start_at, video_type, channel_name, is_abj, created_at"
    )
    .order("published_at", { ascending: false })
    .limit(120);

  if (!canonical.error) {
    return (canonical.data ?? []) as CachedVideo[];
  }

  const maybeSchemaMismatch = /(column|relation) .* does not exist/i.test(canonical.error.message);
  if (!maybeSchemaMismatch) {
    throw canonical.error;
  }

  const legacy = await supabase
    .from("videos")
    .select("id, source_id, channel_id, video_id, title, thumbnail, published_at, scheduled_start_time, kind, created_at")
    .order("published_at", { ascending: false })
    .limit(120);

  if (legacy.error) {
    throw legacy.error;
  }

  const sourceIds = Array.from(
    new Set((legacy.data ?? []).map((row) => row.source_id).filter((id): id is string => Boolean(id)))
  );
  let sourceNameById = new Map<string, string>();
  if (sourceIds.length > 0) {
    const { data: sourceRows } = await supabase
      .from("sources")
      .select("id, source_name")
      .in("id", sourceIds);
    sourceNameById = new Map((sourceRows ?? []).map((row) => [row.id as string, row.source_name as string]));
  }

  return (legacy.data ?? []).map((row) => {
    const sourceId = (row.source_id as string | null) ?? null;
    return {
      id: row.id as string,
      source_id: sourceId,
      channel_id: (row.channel_id as string) ?? "",
      video_id: row.video_id as string,
      title: row.title as string,
      thumbnail: (row.thumbnail as string | null) ?? null,
      published_at: (row.published_at as string | null) ?? null,
      scheduled_start_at: (row.scheduled_start_time as string | null) ?? null,
      video_type: row.kind === "upcoming" ? "upcoming" : "vod",
      channel_name: sourceId ? sourceNameById.get(sourceId) ?? "Neznámý kanál" : "Neznámý kanál",
      is_abj: false,
      created_at: row.created_at as string,
    } satisfies CachedVideo;
  });
}

export default async function FeedPage() {
  let timeline: ProgramBlock[] = [];
  let timelineErrorMessage = "";
  let playlist: CachedVideo[] = [];
  let feedErrorMessage = "";
  const fallbackBaseTimestamp = new Date().toISOString();

  try {
    timeline = await getProgram();
  } catch (error) {
    console.error("Program timeline build failed:", error);
    timelineErrorMessage = error instanceof Error ? error.message : "Neznámá chyba při načítání timeline";
  }

  try {
    playlist = await loadFeedVideos();

    if (playlist.length === 0) {
      const directFallback = await buildPlaylist();
      const baseMs = new Date(fallbackBaseTimestamp).getTime();
      playlist = directFallback.slice(0, 120).map((item, idx) => {
        const publishedAt = item.publishedAt ?? new Date(baseMs - idx * 60_000).toISOString();
        return {
          id: `${item.videoId}-${idx}`,
          source_id: item.sourceId ?? null,
          channel_id: "",
          video_id: item.videoId,
          title: item.title,
          thumbnail: null,
          published_at: publishedAt,
          scheduled_start_at: null,
          video_type: "vod",
          channel_name: item.channelName,
          is_abj: item.channelName.toLowerCase().includes("abj"),
          created_at: publishedAt,
        } satisfies CachedVideo;
      });
    }
  } catch (error) {
    console.error("Feed playlist build failed:", error);
    feedErrorMessage = error instanceof Error ? error.message : "Neznámá chyba při načítání feedu";
  }

  return (
    <section className="space-y-6 pt-6">
      <header className="space-y-2">
        <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--text-soft)]">
          Výběr pořadů
        </p>
        <h1 className="font-[var(--font-playfair)] text-2xl font-normal tracking-wide text-[var(--text-main)] md:text-3xl">
          Přehled videí
        </h1>
      </header>

      <section className="space-y-3">
        <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--text-soft)]">
          Dnešní program (V3)
        </p>

        {timeline.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--text-soft)] shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-md">
            Programová timeline je dočasně prázdná.
            {timelineErrorMessage ? (
              <p className="mt-2 text-xs opacity-80">Technická hláška: {timelineErrorMessage}</p>
            ) : null}
          </div>
        ) : (
          <div className="space-y-3">
            {timeline.slice(0, 12).map((block) => {
              const href = block.videoId ? `/live?videoId=${encodeURIComponent(block.videoId)}` : "/live";
              return (
                <Link
                  key={block.id}
                  href={href}
                  className="group flex min-h-12 gap-4 rounded-xl bg-[var(--surface-warm)] p-3 shadow-[0_2px_12px_rgba(0,0,0,0.35)] transition-all duration-200 ease-out hover:scale-[1.02] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
                >
                  <div className="overflow-hidden rounded-xl">
                    <Image
                      src={block.thumbnail ?? "/placeholder-thumb.jpg"}
                      alt={block.title}
                      width={320}
                      height={180}
                      className="h-24 w-40 object-cover transition-all duration-200 ease-out group-hover:scale-[1.02]"
                      loading="lazy"
                      unoptimized={block.thumbnail !== undefined}
                    />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[var(--accent-blue)]">
                        {formatPragueTime(block.start)}–{formatPragueTime(block.end)}
                      </span>
                      <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] uppercase tracking-wide text-[var(--text-soft)]">
                        {BLOCK_TYPE_LABELS[block.type]}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-sm font-medium text-[var(--text-main)]">{block.title}</p>
                    <p className="text-xs text-[var(--text-soft)]">
                      {block.channel}
                      {block.isABJ ? " · ABJ" : ""}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--text-soft)]">
          Archiv videí (cache)
        </p>

      {playlist.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-base text-[var(--text-soft)] shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-md">
          <p>Feed je zatím prázdný, zkuste to prosím za chvíli.</p>
          {feedErrorMessage ? <p className="mt-2 text-xs opacity-80">Technická hláška: {feedErrorMessage}</p> : null}
        </div>
      ) : (
        <div className="space-y-3">
          {playlist.map((item) => (
            <Link
              key={`${item.video_id}-${item.source_id ?? "source"}`}
              href={`/live?videoId=${encodeURIComponent(item.video_id)}`}
              className="group flex min-h-12 gap-4 rounded-xl bg-[var(--surface-warm)] p-3 shadow-[0_2px_12px_rgba(0,0,0,0.35)] transition-all duration-200 ease-out hover:scale-[1.02] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
            >
              <div className="overflow-hidden rounded-xl">
                <Image
                  src={item.thumbnail ?? "/placeholder-thumb.jpg"}
                  alt={item.title}
                  width={320}
                  height={180}
                  className="h-24 w-40 object-cover transition-all duration-200 ease-out group-hover:scale-[1.02]"
                  loading="lazy"
                  unoptimized={item.thumbnail !== null}
                />
              </div>
              <div className="min-w-0 space-y-1">
                <p className="text-xs text-[var(--text-soft)]">{item.channel_name}</p>
                <p className="line-clamp-2 text-sm font-medium text-[var(--text-main)]">{item.title}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
      </section>
    </section>
  );
}
