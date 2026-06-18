import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { JsonLd } from "@/components/seo/JsonLd";
import { VideoSeoPageContent } from "@/components/seo/VideoSeoPageContent";
import { resolveChannelSlugForName } from "@/lib/seo/channelPageData";
import { buildVideoPageJsonLd } from "@/lib/seo/jsonLd";
import { parseVideoSlug, videoSeoPath } from "@/lib/seo/slug";
import { loadCachedVideoTranscript } from "@/lib/seo/transcriptServer";
import { buildVideoMetaDescription, buildVideoSeoTitle } from "@/lib/seo/videoTitles";
import { loadRelatedChannelVideos, loadVideoSeoRecord } from "@/lib/seo/videoPageData";
import { SITE_URL } from "@/lib/site";

export const revalidate = 3600;

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const parsed = parseVideoSlug(slug);
  if (!parsed) return { title: "Video nenalezeno | Verox" };

  const video = await loadVideoSeoRecord(parsed.videoId);
  if (!video?.slug) return { title: "Video nenalezeno | Verox" };

  const pageUrl = `${SITE_URL}${videoSeoPath(video.slug)}`;
  const title = buildVideoSeoTitle(video.title, video.channelName);
  const description = buildVideoMetaDescription(video.title, video.channelName);

  return {
    title,
    description,
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title,
      description,
      type: "video.other",
      url: pageUrl,
      images: [{ url: video.thumbnailUrl }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [video.thumbnailUrl],
    },
  };
}

export default async function VideoSeoPage({ params }: PageProps) {
  const { slug } = await params;
  const parsed = parseVideoSlug(slug);
  if (!parsed) notFound();

  const video = await loadVideoSeoRecord(parsed.videoId);
  if (!video?.slug || video.slug !== slug.trim()) notFound();

  const [relatedVideos, transcript, channelSlug] = await Promise.all([
    loadRelatedChannelVideos(video.channelName, video.videoId),
    loadCachedVideoTranscript(video.videoId),
    resolveChannelSlugForName(video.channelName),
  ]);

  const transcriptText =
    transcript?.status === "ready" && transcript.transcript?.trim() ? transcript.transcript : null;
  const pageUrl = `${SITE_URL}${videoSeoPath(video.slug)}`;
  const jsonLd = buildVideoPageJsonLd({
    video,
    pageUrl,
    transcriptExcerpt: transcriptText,
    channelSlug,
  });

  return (
    <>
      <JsonLd data={jsonLd} />
      <VideoSeoPageContent
        video={video}
        relatedVideos={relatedVideos}
        transcriptText={transcriptText}
        channelSlug={channelSlug}
      />
    </>
  );
}
