import Link from "next/link";

import { getProgram } from "@/lib/programEngine";
import type { ProgramBlock } from "@/lib/epg-types";

export const dynamic = "force-dynamic";

const BLOCK_TYPE_LABELS: Record<ProgramBlock["type"], string> = {
  live: "Živě",
  premiere: "Premiéra",
  recorded: "Záznam",
  coming_up: "Za chvíli",
  fixed_abj: "ABJ blok",
  ceremonial: "Ceremoniál",
};

function formatPragueDateTime(iso: string): { date: string; time: string } {
  const date = new Date(iso);
  return {
    date: new Intl.DateTimeFormat("cs-CZ", {
      timeZone: "Europe/Prague",
      weekday: "short",
      day: "numeric",
      month: "numeric",
    }).format(date),
    time: new Intl.DateTimeFormat("cs-CZ", {
      timeZone: "Europe/Prague",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date),
  };
}

export default async function ProgramPage() {
  let timeline: ProgramBlock[] = [];
  let errorMessage = "";

  try {
    timeline = await getProgram();
  } catch (error) {
    console.error("program-page-load-failed", error);
    errorMessage = error instanceof Error ? error.message : "Neznámá chyba při načítání programu";
  }

  return (
    <section className="space-y-4 px-5 py-6">
      <header className="space-y-1">
        <p className="text-[11px] uppercase tracking-[0.14em] text-abj-text2">Program</p>
        <h1 className="font-[var(--font-serif)] text-2xl font-semibold text-abj-text1">Dnešní vysílání</h1>
      </header>

      {timeline.length === 0 ? (
        <div className="rounded-xl border border-[var(--abj-gold-dim)] bg-abj-panel p-4 text-sm text-abj-text2">
          Program je dočasně prázdný.
          {errorMessage ? <p className="mt-2 text-xs opacity-90">Technická hláška: {errorMessage}</p> : null}
        </div>
      ) : (
        <div className="space-y-2">
          {timeline.map((block) => {
            const start = formatPragueDateTime(block.start);
            const end = formatPragueDateTime(block.end);
            const href = block.videoId ? `/live?videoId=${encodeURIComponent(block.videoId)}` : "/live";

            return (
              <Link
                key={block.id}
                href={href}
                className="flex items-center gap-4 rounded-lg border border-[var(--abj-gold-dim)] bg-abj-panel px-3 py-3 transition-colors hover:bg-abj-card"
              >
                <div className="w-[110px] shrink-0 text-[11px] text-abj-text2">
                  <p className="uppercase tracking-[0.08em]">{start.date}</p>
                  <p className="font-semibold text-abj-gold">
                    {start.time}–{end.time}
                  </p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-[var(--font-serif)] text-[17px] leading-tight text-abj-text1">
                    {block.title}
                  </p>
                  <p className="mt-1 text-xs text-abj-text2">
                    {block.channel}
                    {block.isABJ ? " · ABJ" : ""}
                  </p>
                </div>
                <span className="rounded border border-[var(--abj-gold-dim)] px-2 py-1 text-[10px] uppercase tracking-[0.08em] text-abj-text2">
                  {BLOCK_TYPE_LABELS[block.type]}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
