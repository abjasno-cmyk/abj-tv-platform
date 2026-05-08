import { createSupabaseServerClient } from "@/lib/supabase/server";

export const revalidate = 300;
export const dynamic = "force-dynamic";

function siteOrigin(): string {
  const env =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);
  return env ?? "https://abj-tv-platform.vercel.app";
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: editions } = await supabase
    .from("news_editions")
    .select("id, slug, edition_type, title, subtitle, summary, published_at, generated_at")
    .eq("status", "published")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(40);

  const origin = siteOrigin();
  const feed = {
    version: "https://jsonfeed.org/version/1.1",
    title: "Jasné zprávy — ABJ",
    description: "Redakční vydání ABJ. Domácí, zahraniční zprávy a perlička dne.",
    home_page_url: `${origin}/jasne-zpravy`,
    feed_url: `${origin}/jasne-zpravy/feed.json`,
    language: "cs-CZ",
    items: (editions ?? []).map((e) => ({
      id: `${origin}/jasne-zpravy/${e.slug}`,
      url: `${origin}/jasne-zpravy/${e.slug}`,
      title: e.title,
      summary: e.subtitle ?? undefined,
      content_text: e.summary ?? "",
      date_published: new Date(e.published_at ?? e.generated_at).toISOString(),
      tags: [e.edition_type],
    })),
  };

  return new Response(JSON.stringify(feed, null, 2), {
    headers: {
      "Content-Type": "application/feed+json; charset=utf-8",
      "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
