import Link from "next/link";
import Image from "next/image";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CachedVideo } from "@/lib/epg-types";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  let playlist: CachedVideo[] = [];

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("videos")
      .select(
        "id, source_id, channel_id, video_id, title, thumbnail, published_at, scheduled_start_at, video_type, channel_name, is_abj, created_at"
      )
      .order("published_at", { ascending: false })
      .limit(120);

    if (error) {
      throw error;
    }

    playlist = (data ?? []) as CachedVideo[];
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
              key={`${item.video_id}-${item.source_id ?? "source"}`}
              href="/live"
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
  );
}
