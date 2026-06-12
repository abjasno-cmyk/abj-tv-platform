import { listChannelsForSitemap } from "@/lib/seo/channelPageData";
import { channelSeoPath } from "@/lib/seo/channelSlug";
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

export async function GET() {
  const channels = await listChannelsForSitemap();
  const now = new Date().toISOString();
  const items = channels
    .map((channel) => {
      const pageUrl = `${SITE_URL}${channelSeoPath(channel.slug)}`;
      return `
  <url>
    <loc>${escapeXml(pageUrl)}</loc>
    <lastmod>${escapeXml(now)}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.75</priority>
  </url>`;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${items}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
