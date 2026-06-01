import { createSupabaseNewsClient, type NewsEdition } from "@/lib/jasne-zpravy";
import { SITE_URL } from "@/lib/site";

export const revalidate = 300;

function siteOrigin(): string {
  return SITE_URL;
}

export async function GET() {
  let supabase;
  try {
    supabase = createSupabaseNewsClient();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Neznámá chyba";
    return new Response(
      JSON.stringify({ error: "Supabase není dostupná", message }, null, 2),
      {
        status: 503,
        headers: {
          "Content-Type": "application/feed+json; charset=utf-8",
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
  const feed = {
    version: "https://jsonfeed.org/version/1.1",
    title: "Jasné zprávy — ABJ",
    description: "Redakční vydání ABJ. Domácí, zahraniční zprávy a perlička dne.",
    home_page_url: `${origin}/jasne-zpravy`,
    feed_url: `${origin}/jasne-zpravy/feed.json`,
    language: "cs-CZ",
    items: ((editions ?? []) as NewsEdition[]).map((e) => {
      const timestamp = e.published_at ?? e.generated_at ?? new Date().toISOString();
      return {
        id: `${origin}/jasne-zpravy/${e.slug}`,
        url: `${origin}/jasne-zpravy/${e.slug}`,
        title: e.title,
        summary: e.subtitle ?? undefined,
        content_text: e.summary ?? "",
        date_published: new Date(timestamp).toISOString(),
        tags: [e.edition_type],
      };
    }),
  };

  return new Response(JSON.stringify(feed, null, 2), {
    headers: {
      "Content-Type": "application/feed+json; charset=utf-8",
      "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
