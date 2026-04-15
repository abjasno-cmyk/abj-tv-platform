import { buildPlaylist } from "@/lib/buildPlaylist";
import TVPlayer from "@/components/TVPlayer";
import { Chat } from "@/components/Chat";

export default async function LivePage() {
  try {
    const playlist = await buildPlaylist();

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
  } catch (error) {
    console.error("live-page-buildPlaylist-failed", error);

    return (
      <section className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-600">
        Vysílání se načítá, zkuste za chvíli.
      </section>
    );
  }
}
