import { buildPlaylist } from "@/lib/buildPlaylist";
import TVPlayer from "@/components/TVPlayer";
import { Chat } from "@/components/Chat";
import type { PlaylistItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function LivePage() {
  let playlist: PlaylistItem[] = [];

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

  return (
    <section className="space-y-4">
      <TVPlayer playlist={playlist} />
      <Chat />
    </section>
  );
}
