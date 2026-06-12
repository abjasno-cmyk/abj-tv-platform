import { SITE_URL } from "@/lib/site";
import { channelSeoPath } from "@/lib/seo/channelSlug";
import type { ChannelSeoRecord } from "@/lib/seo/channelPageData";
import { videoSeoPath } from "@/lib/seo/slug";

export function buildChannelPageJsonLd(channel: ChannelSeoRecord, pageUrl: string): Record<string, unknown>[] {
  const collectionPage: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: channel.channelName,
    description: `Videa a rozhovory z kanálu ${channel.channelName} na Verox.cz`,
    url: pageUrl,
    isPartOf: {
      "@type": "WebSite",
      name: "Verox",
      url: SITE_URL,
    },
  };

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
        name: "Kanály",
        item: `${SITE_URL}/kanaly`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: channel.channelName,
        item: pageUrl,
      },
    ],
  };

  const itemList: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Nejnovější videa — ${channel.channelName}`,
    itemListElement: channel.videos.slice(0, 12).map((video, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${SITE_URL}${video.slug ? videoSeoPath(video.slug) : video.playerPath}`,
      name: video.title,
    })),
  };

  const organization: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Verox",
    url: SITE_URL,
  };

  if (channel.channelUrl) {
    collectionPage.mainEntity = {
      "@type": "Organization",
      name: channel.channelName,
      url: channel.channelUrl,
    };
  }

  return [collectionPage, breadcrumbs, itemList, organization];
}
