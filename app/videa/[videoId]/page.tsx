import type { Metadata } from "next";
import { notFound } from "next/navigation";

import LivePage from "@/app/live/LivePage";
import { loadLivePageShell } from "@/lib/livePageShell";
import { videoSeoPath } from "@/lib/seo/slug";
import { buildVideoMetaDescription, buildVideoSeoTitle } from "@/lib/seo/videoTitles";
import { loadVideoSeoRecord } from "@/lib/seo/videoPageData";
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
  const seoRecord = await loadVideoSeoRecord(meta.videoId);
  const pageUrl = `${SITE_URL}${videoSharePath(meta.videoId)}`;
  const canonicalUrl = seoRecord?.slug ? `${SITE_URL}${videoSeoPath(seoRecord.slug)}` : undefined;
  const title = buildVideoSeoTitle(meta.title, meta.channelName);
  const description = buildVideoMetaDescription(meta.title, meta.channelName);

  return {
    title,
    description,
    alternates: canonicalUrl ? { canonical: canonicalUrl } : undefined,
    openGraph: {
      title,
      description,
      type: "video.other",
      url: canonicalUrl ?? pageUrl,
      images: [{ url: meta.thumbnailUrl }],
    },
    twitter: {
      card: "summary_large_image",
      title,
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
