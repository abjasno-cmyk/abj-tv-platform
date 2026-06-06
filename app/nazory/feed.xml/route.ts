import { listPublishedArticles } from "@/lib/nazory/articles";
import { getAuthorDisplayName } from "@/lib/nazory/display";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/site";
import type { AuthorProfileRow } from "@/lib/nazory/types";

export const revalidate = 300;

function escapeXml(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const articles = await listPublishedArticles(supabase, 40);
  const authorIds = [...new Set(articles.map((article) => article.author_id))];
  const { data: authors } = await supabase
    .from("author_profiles")
    .select("user_id, first_name, last_name")
    .in("user_id", authorIds);

  const authorMap = new Map<string, string>();
  for (const row of (authors ?? []) as Array<Pick<AuthorProfileRow, "user_id" | "first_name" | "last_name">>) {
    authorMap.set(row.user_id, getAuthorDisplayName(row));
  }

  const origin = SITE_URL;
  const items = articles
    .map((article) => {
      const url = `${origin}/nazory/${article.slug}`;
      const pubDate = new Date(article.published_at ?? article.created_at).toUTCString();
      const author = authorMap.get(article.author_id) ?? "VEROX";
      return `
    <item>
      <title>${escapeXml(article.title)}</title>
      <link>${escapeXml(url)}</link>
      <guid isPermaLink="true">${escapeXml(url)}</guid>
      <pubDate>${pubDate}</pubDate>
      <author>${escapeXml(author)}</author>
      <description>${escapeXml(article.perex)}</description>
      <content:encoded><![CDATA[${article.perex}]]></content:encoded>
    </item>`;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Názory — VEROX</title>
    <link>${origin}/nazory</link>
    <atom:link href="${origin}/nazory/feed.xml" rel="self" type="application/rss+xml" />
    <description>Autorské články schválených přispěvatelů VEROX.</description>
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
