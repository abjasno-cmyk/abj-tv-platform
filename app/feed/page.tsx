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
    <section className="mx-auto flex w-full max-w-3xl flex-col space-y-4">
      <h1 className="text-2xl font-semibold text-white">Feed</h1>

      {playlist.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-neutral-950 p-6 text-sm text-gray-400 shadow-lg">
          Feed je zatím prázdný, zkuste to prosím za chvíli.
        </div>
      ) : (
        <div className="space-y-4">
          {playlist.map((item) => (
            <Link
              key={`${item.videoId}-${item.sourceId ?? "source"}`}
              href="/live"
              className="group flex gap-4 rounded-2xl border border-white/10 bg-neutral-950 p-4 shadow-lg transition-all duration-300 hover:border-white/20 hover:bg-neutral-900"
            >
              <div className="overflow-hidden rounded-xl">
                <Image
                  src={`https://img.youtube.com/vi/${item.videoId}/hqdefault.jpg`}
                  alt={item.title}
                  width={360}
                  height={200}
                  className="h-24 w-40 object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <div className="flex min-w-0 flex-1 flex-col justify-center">
                <p className="text-sm text-gray-400">{item.channelName}</p>
                <p className="line-clamp-2 text-base font-semibold text-white">
                  {item.title}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
