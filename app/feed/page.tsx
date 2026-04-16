import Link from "next/link";
import Image from "next/image";

import { buildPlaylist } from "@/lib/buildPlaylist";
import type { PlaylistItem } from "@/lib/buildPlaylist";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  let playlist: PlaylistItem[] = [];

  try {
    playlist = await buildPlaylist();
  } catch (error) {
    console.error("Feed playlist build failed:", error);
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

      {playlist.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-base text-[var(--text-soft)] shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-md">
          Feed je zatím prázdný, zkuste to prosím za chvíli.
        </div>
      ) : (
        <div className="space-y-3">
          {playlist.map((item) => (
            <Link
              key={`${item.videoId}-${item.sourceId ?? "source"}`}
              href="/live"
              className="group flex min-h-12 gap-4 rounded-xl bg-[var(--surface-warm)] p-3 shadow-[0_2px_12px_rgba(0,0,0,0.35)] transition-all duration-200 ease-out hover:scale-[1.02] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
            >
              <div className="overflow-hidden rounded-xl">
                <Image
                  src={`https://img.youtube.com/vi/${item.videoId}/hqdefault.jpg`}
                  alt={item.title}
                  width={320}
                  height={180}
                  className="h-24 w-40 object-cover transition-all duration-200 ease-out group-hover:scale-[1.02]"
                  loading="lazy"
                />
              </div>
              <div className="min-w-0 space-y-1">
                <p className="text-xs text-[var(--text-soft)]">{item.channelName}</p>
                <p className="line-clamp-2 text-sm font-medium text-[var(--text-main)]">{item.title}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
