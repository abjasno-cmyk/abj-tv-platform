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
    <section className="mx-auto w-full max-w-6xl space-y-8">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-wide text-gray-500">
          Media feed
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900">Výběr videí</h1>
      </header>

      {playlist.length === 0 ? (
        <div className="rounded-3xl border border-white/70 bg-white p-6 text-sm text-gray-500 shadow-sm">
          Feed je zatím prázdný, zkuste to prosím za chvíli.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {playlist.map((item, index) => (
            <Link
              key={`${item.videoId}-${item.sourceId ?? "source"}`}
              href="/live"
              className={`group overflow-hidden rounded-2xl border border-white/70 bg-white shadow-sm transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:shadow-md ${
                index === 0 ? "col-span-2 md:col-span-2 lg:col-span-2" : ""
              }`}
            >
              <div className="relative overflow-hidden">
                <Image
                  src={`https://img.youtube.com/vi/${item.videoId}/hqdefault.jpg`}
                  alt={item.title}
                  width={720}
                  height={400}
                  className={`w-full object-cover transition-transform duration-200 ease-in-out group-hover:scale-105 ${
                    index === 0 ? "h-52 md:h-56" : "h-36"
                  }`}
                  loading="lazy"
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/50 to-transparent" />
              </div>
              <div className="space-y-1 p-3">
                <p className="text-xs text-gray-500">{item.channelName}</p>
                <p className="line-clamp-2 text-sm font-medium text-gray-900">{item.title}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
