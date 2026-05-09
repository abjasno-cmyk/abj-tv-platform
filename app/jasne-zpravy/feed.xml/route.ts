import { createSupabaseNewsClient, type NewsEdition } from "@/lib/jasne-zpravy";

export const revalidate = 300;

const SITE_TITLE = "Jasné zprávy — ABJ";
const SITE_DESCRIPTION =
  "Redakční vydání ABJ. Domácí, zahraniční zprávy a perlička dne.";

function escapeXml(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function siteOrigin(): string {
  const env =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);
  return env ?? "https://abj-tv-platform.vercel.app";
}

export async function GET() {
  let supabase;
  try {
    supabase = createSupabaseNewsClient();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Neznámá chyba";
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><error>${escapeXml(message)}</error>`,
      {
        status: 503,
        headers: {
          "Content-Type": "application/rss+xml; charset=utf-8",
        },
      },
    );
  }
  const { data: editions } = await supabase
    .from("news_editions")
    .select("id, slug, edition_type, title, subtitle, summary, published_at, generated_at")
    .eq("status", "published")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(40);

  const origin = siteOrigin();
  const items = ((editions ?? []) as NewsEdition[]).map((e) => {
    const url = `${origin}/jasne-zpravy/${e.slug}`;
    const timestamp = e.published_at ?? e.generated_at ?? new Date().toISOString();
    const pubDate = new Date(timestamp).toUTCString();
    return `
    <item>
      <title>${escapeXml(e.title)}</title>
      <link>${escapeXml(url)}</link>
      <guid isPermaLink="true">${escapeXml(url)}</guid>
      <pubDate>${pubDate}</pubDate>
      ${e.subtitle ? `<description>${escapeXml(e.subtitle)}</description>` : ""}
      ${e.summary ? `<content:encoded><![CDATA[${e.summary}]]></content:encoded>` : ""}
    </item>`;
  }).join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE_TITLE)}</title>
    <link>${origin}/jasne-zpravy</link>
    <atom:link href="${origin}/jasne-zpravy/feed.xml" rel="self" type="application/rss+xml" />
    <description>${escapeXml(SITE_DESCRIPTION)}</description>
    <language>cs-cz</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
