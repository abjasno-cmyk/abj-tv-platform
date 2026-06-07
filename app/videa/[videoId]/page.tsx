import type { Metadata } from "next";
import { notFound } from "next/navigation";

import LivePage from "@/app/live/LivePage";
import { loadLivePageShell } from "@/lib/livePageShell";
import { SITE_URL } from "@/lib/site";
import { videoSharePath } from "@/lib/viewer/videoMetadata";
import { isValidYouTubeVideoId, loadVideoPageMeta } from "@/lib/viewer/videoPageServer";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ videoId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const { videoId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const rawTitle = resolvedSearchParams?.title;
  const rawChannel = resolvedSearchParams?.channel;
  const fallbackTitle = (Array.isArray(rawTitle) ? rawTitle[0] : rawTitle)?.trim() || null;
  const fallbackChannel = (Array.isArray(rawChannel) ? rawChannel[0] : rawChannel)?.trim() || null;

  if (!isValidYouTubeVideoId(videoId)) {
    return { title: "Video nenalezeno — VEROX" };
  }

  const meta = await loadVideoPageMeta(videoId, {
    title: fallbackTitle,
    channelName: fallbackChannel,
  });
  const pageUrl = `${SITE_URL}${videoSharePath(meta.videoId)}`;
  const description = meta.channelName
    ? `${meta.title} — ${meta.channelName} na VEROX`
    : `${meta.title} na VEROX`;

  return {
    title: `${meta.title} — VEROX`,
    description,
    openGraph: {
      title: meta.title,
      description,
      type: "video.other",
      url: pageUrl,
      images: [{ url: meta.thumbnailUrl }],
    },
    twitter: {
      card: "summary_large_image",
      title: meta.title,
      description,
      images: [meta.thumbnailUrl],
    },
  };
}

export default async function VideoSharePage({
  params,
  searchParams,
}: {
  params: Promise<{ videoId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { videoId } = await params;
  if (!isValidYouTubeVideoId(videoId)) notFound();

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const rawTitle = resolvedSearchParams?.title;
  const rawChannel = resolvedSearchParams?.channel;
  const fallbackTitle = (Array.isArray(rawTitle) ? rawTitle[0] : rawTitle)?.trim() || null;
  const fallbackChannel = (Array.isArray(rawChannel) ? rawChannel[0] : rawChannel)?.trim() || null;

  const [{ epg, channels }, meta] = await Promise.all([
    loadLivePageShell(),
    loadVideoPageMeta(videoId, {
      title: fallbackTitle,
      channelName: fallbackChannel,
    }),
  ]);

  return (
    <LivePage
      epg={epg}
      initialVideoId={meta.videoId}
      initialTitle={meta.title}
      initialChannelName={meta.channelName}
      initialStartSeconds={0}
      initialIsLive={false}
      channels={channels}
    />
  );
}
