import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ChannelSeoPageContent } from "@/components/seo/ChannelSeoPageContent";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildChannelPageJsonLd } from "@/lib/seo/channelJsonLd";
import { channelSeoPath } from "@/lib/seo/channelSlug";
import { loadChannelSeoRecord } from "@/lib/seo/channelPageData";
import { buildChannelMetaDescription, buildChannelSeoTitle } from "@/lib/seo/channelTitles";
import { SITE_URL } from "@/lib/site";

export const revalidate = 3600;

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const channel = await loadChannelSeoRecord(slug);
  if (!channel) return { title: "Kanál nenalezen | Verox" };

  const pageUrl = `${SITE_URL}${channelSeoPath(channel.slug)}`;
  const title = buildChannelSeoTitle(channel.channelName, channel.latestPublishedAt);
  const description = buildChannelMetaDescription(channel.channelName, channel.latestVideoTitle);

  return {
    title,
    description,
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: pageUrl,
      images: channel.avatarUrl ? [{ url: channel.avatarUrl }] : undefined,
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: channel.avatarUrl ? [channel.avatarUrl] : undefined,
    },
  };
}

export default async function ChannelSeoPage({ params }: PageProps) {
  const { slug } = await params;
  const channel = await loadChannelSeoRecord(slug);
  if (!channel || channel.slug !== slug.trim()) notFound();

  const pageUrl = `${SITE_URL}${channelSeoPath(channel.slug)}`;
  const jsonLd = buildChannelPageJsonLd(channel, pageUrl);

  return (
    <>
      <JsonLd data={jsonLd} />
      <ChannelSeoPageContent channel={channel} />
    </>
  );
}
