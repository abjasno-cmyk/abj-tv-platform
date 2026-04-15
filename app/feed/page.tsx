import Link from "next/link";

import { buildPlaylist } from "@/lib/buildPlaylist";
import type { PlaylistItem } from "@/lib/types";

export default async function FeedPage() {
  let playlist: PlaylistItem[] = [];

  try {
    playlist = await buildPlaylist();
  } catch (error) {
    console.error("Feed playlist build failed:", error);
  }

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <h1 className="text-xl font-semibold text-gray-900">Feed</h1>

      {playlist.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
          Feed je zatím prázdný, zkuste to prosím za chvíli.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {playlist.map((item) => (
            <Link
              key={`${item.videoId}-${item.sourceId ?? "source"}`}
              href="/live"
              className="flex gap-3 rounded-xl border border-gray-200 bg-white p-3 transition hover:border-gray-300"
            >
              <img
                src={`https://img.youtube.com/vi/${item.videoId}/hqdefault.jpg`}
                alt={item.title}
                className="h-20 w-36 rounded-md object-cover"
                loading="lazy"
              />
              <div className="flex min-w-0 flex-1 flex-col justify-center">
                <p className="text-sm text-gray-500">{item.channelName}</p>
                <p className="line-clamp-2 text-base font-medium text-gray-900">
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
