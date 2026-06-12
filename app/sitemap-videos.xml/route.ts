import { listVideosForSitemap } from "@/lib/seo/videoPageData";
import { videoSeoPath } from "@/lib/seo/slug";
import { SITE_URL } from "@/lib/site";

export const revalidate = 3600;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function isoDurationFromMinutes(durationMin: number | null): string {
  if (!durationMin || durationMin <= 0) return "";
  const seconds = Math.max(1, Math.round(durationMin * 60));
  return `<video:duration>${seconds}</video:duration>`;
}

export async function GET() {
  const videos = await listVideosForSitemap(500);
  const items = videos
    .map((video) => {
      if (!video.slug) return "";
      const pageUrl = `${SITE_URL}${videoSeoPath(video.slug)}`;
      const playerUrl = `https://www.youtube.com/embed/${encodeURIComponent(video.videoId)}`;
      const publicationDate = video.publishedAt ? new Date(video.publishedAt).toISOString() : "";
      return `
  <url>
    <loc>${escapeXml(pageUrl)}</loc>
    ${video.publishedAt ? `<lastmod>${escapeXml(new Date(video.publishedAt).toISOString())}</lastmod>` : ""}
    <video:video>
      <video:thumbnail_loc>${escapeXml(video.thumbnailUrl)}</video:thumbnail_loc>
      <video:title>${escapeXml(video.title)}</video:title>
      <video:description>${escapeXml(video.description)}</video:description>
      <video:player_loc>${escapeXml(playerUrl)}</video:player_loc>
      ${publicationDate ? `<video:publication_date>${escapeXml(publicationDate)}</video:publication_date>` : ""}
      ${isoDurationFromMinutes(video.durationMin)}
    </video:video>
  </url>`;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
${items}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
