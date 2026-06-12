import { channelSeoPath } from "@/lib/seo/channelSlug";
import { SITE_URL } from "@/lib/site";
import type { VideoSeoRecord } from "@/lib/seo/videoPageData";

function isoDurationFromMinutes(durationMin: number | null): string | undefined {
  if (!durationMin || durationMin <= 0) return undefined;
  const hours = Math.floor(durationMin / 60);
  const minutes = durationMin % 60;
  if (hours > 0) return `PT${hours}H${minutes > 0 ? `${minutes}M` : ""}`;
  return `PT${minutes}M`;
}

export function buildVideoPageJsonLd(input: {
  video: VideoSeoRecord;
  pageUrl: string;
  transcriptExcerpt?: string | null;
  channelSlug?: string | null;
}): Record<string, unknown>[] {
  const { video, pageUrl, transcriptExcerpt, channelSlug } = input;
  const channelItemUrl = channelSlug ? `${SITE_URL}${channelSeoPath(channelSlug)}` : `${SITE_URL}/kanaly`;
  const embedUrl = `https://www.youtube.com/embed/${encodeURIComponent(video.videoId)}`;

  const videoObject: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: video.title,
    description: video.description,
    thumbnailUrl: [video.thumbnailUrl],
    uploadDate: video.publishedAt ?? undefined,
    embedUrl,
    contentUrl: video.youtubeUrl,
    duration: isoDurationFromMinutes(video.durationMin),
    publisher: {
      "@type": "Organization",
      name: "Verox",
      url: SITE_URL,
    },
    mainEntityOfPage: pageUrl,
  };

  if (transcriptExcerpt && transcriptExcerpt.trim().length > 0) {
    videoObject.transcript = transcriptExcerpt.slice(0, 5000);
  }

  const breadcrumbs: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Verox",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: video.channelName || "Kanál",
        item: channelItemUrl,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: video.title,
        item: pageUrl,
      },
    ],
  };

  const organization: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Verox",
    url: SITE_URL,
  };

  return [videoObject, breadcrumbs, organization];
}
