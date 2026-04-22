import { fetchFeed } from "@/lib/api";
import { ArchivClient, type ArchivViewData } from "@/app/archiv/ArchivClient";

export const dynamic = "force-dynamic";

function mapPostToVideo(post: NonNullable<Awaited<ReturnType<typeof fetchFeed>>>["posts"][number]) {
  return {
    video_id: post.video_id,
    title: post.headline?.trim() || post.what?.trim() || "Bez titulku",
    channel: post.channel_name || "Neznámý kanál",
    published_at: post.video_published_at ?? post.created_at,
    topics: post.tags ?? [],
    thumbnail: `https://i.ytimg.com/vi/${encodeURIComponent(post.video_id)}/hqdefault.jpg`,
    tldr: post.what,
    context: post.why ?? undefined,
    impact: post.impact ?? undefined,
    freshness: post.freshness,
  };
}

function buildInitialData(feed: Awaited<ReturnType<typeof fetchFeed>>): ArchivViewData {
  if (!feed) {
    return {
      topForDisplay: [],
      channels: [],
    };
  }

  const mapped = feed.posts.map(mapPostToVideo);
  const grouped = mapped.reduce<Record<string, typeof mapped>>((acc, video) => {
    const key = video.channel || "Neznámý kanál";
    if (!acc[key]) acc[key] = [];
    acc[key].push(video);
    return acc;
  }, {});

  return {
    topForDisplay: mapped.slice(0, 10),
    channels: Object.entries(grouped).map(([channel, videos]) => ({
      channel,
      videos,
    })),
  };
}

async function loadArchivData(): Promise<ArchivViewData> {
  try {
    const feed = await fetchFeed({ page: 1, per_page: 60 });
    return buildInitialData(feed);
  } catch (error) {
    console.error("Failed to load archiv feed", error);
    return {
      topForDisplay: [],
      channels: [],
    };
  }
}

export default async function DayOverviewPage() {
  const initialData = await loadArchivData();
  return <ArchivClient initialData={initialData} />;
}
