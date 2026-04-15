import { buildPlaylist } from "@/lib/buildPlaylist";
import TVPlayer from "@/components/TVPlayer";
import { Chat } from "@/components/Chat";
import type { PlaylistItem } from "@/lib/types";

export const dynamic = "force-dynamic";

type LivePageProps = {
  searchParams?: Promise<{ video?: string | string[] }>;
};

export default async function LivePage({ searchParams }: LivePageProps) {
  let playlist: PlaylistItem[] = [];
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const requestedVideoId = Array.isArray(resolvedSearchParams?.video)
    ? resolvedSearchParams?.video[0]
    : resolvedSearchParams?.video;

  try {
    playlist = await buildPlaylist();
  } catch (error) {
    console.error("live-page-buildPlaylist-failed", error);
  }

  if (!playlist.length) {
    return (
      <section className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-600">
        Vysílání se načítá, zkuste za chvíli.
      </section>
    );
  }

  const initialIndex =
    requestedVideoId !== undefined
      ? playlist.findIndex((item) => item.videoId === requestedVideoId)
      : 0;

  return (
    <section className="space-y-4">
      <TVPlayer playlist={playlist} initialIndex={initialIndex >= 0 ? initialIndex : 0} />
      <Chat />
    </section>
  );
}
