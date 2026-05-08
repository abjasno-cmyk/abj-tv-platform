import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const revalidate = 60;
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: edition } = await supabase
    .from("news_editions")
    .select("title, subtitle, summary, published_at")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (!edition) {
    return { title: "Vydání nenalezeno — Jasné zprávy" };
  }

  const description = edition.subtitle ?? edition.summary ?? undefined;
  const title = `${edition.title} — Jasné zprávy`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      publishedTime: edition.published_at ?? undefined,
      siteName: "Jasné zprávy — ABJ",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

const EDITION_TYPE_LABEL: Record<string, string> = {
  morning: "Ranní",
  noon: "Polední",
  evening: "Večerní",
  manual: "Mimořádné",
};

const CATEGORY_LABEL: Record<string, string> = {
  domestic: "Domácí",
  foreign: "Zahraniční",
  curiosity: "Perlička",
};

const CATEGORY_ORDER: Array<keyof typeof CATEGORY_LABEL> = [
  "domestic",
  "foreign",
  "curiosity",
];

function formatPragueDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("cs-CZ", {
      timeZone: "Europe/Prague",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

type Item = {
  id: string;
  category: "domestic" | "foreign" | "curiosity" | string;
  rank: number;
  headline: string;
  short_headline: string | null;
  lead: string | null;
  body: string;
  why_it_matters: string | null;
  what_to_watch: string | null;
  source_count: number | null;
};

type Source = {
  id: string;
  news_item_id: string;
  source_title: string | null;
  source_name: string | null;
  source_url: string | null;
};

export default async function EditionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: edition, error: editionErr } = await supabase
    .from("news_editions")
    .select("id, slug, edition_type, title, subtitle, summary, published_at, generated_at")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (editionErr) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-red-600">Chyba: {editionErr.message}</p>
      </main>
    );
  }
  if (!edition) notFound();

  const { data: items } = await supabase
    .from("news_items")
    .select(
      "id, category, rank, headline, short_headline, lead, body, why_it_matters, what_to_watch, source_count",
    )
    .eq("edition_id", edition.id)
    .eq("status", "published")
    .order("category", { ascending: true })
    .order("rank", { ascending: true });

  const itemList: Item[] = (items ?? []) as Item[];
  const itemIds = itemList.map((i) => i.id);

  let sourcesByItem = new Map<string, Source[]>();
  if (itemIds.length > 0) {
    const { data: sources } = await supabase
      .from("news_sources")
      .select("id, news_item_id, source_title, source_name, source_url")
      .in("news_item_id", itemIds);
    for (const s of (sources ?? []) as Source[]) {
      const arr = sourcesByItem.get(s.news_item_id) ?? [];
      arr.push(s);
      sourcesByItem.set(s.news_item_id, arr);
    }
  }

  const grouped = new Map<string, Item[]>();
  for (const it of itemList) {
    const arr = grouped.get(it.category) ?? [];
    arr.push(it);
    grouped.set(it.category, arr);
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <nav className="mb-6 text-sm">
        <Link href="/jasne-zpravy" className="text-gray-500 hover:text-gray-900">
          ← Všechna vydání
        </Link>
      </nav>

      <header className="mb-10 border-b border-gray-200 pb-6">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-xs font-bold uppercase tracking-widest text-red-600">
            {EDITION_TYPE_LABEL[edition.edition_type] ?? edition.edition_type} vydání
          </span>
          <time className="text-xs text-gray-500">
            {formatPragueDateTime(edition.published_at ?? edition.generated_at)}
          </time>
        </div>
        <h1 className="mt-3 text-3xl font-black leading-tight">{edition.title}</h1>
        {edition.subtitle && (
          <p className="mt-2 text-lg text-gray-700">{edition.subtitle}</p>
        )}
        {edition.summary && (
          <p className="mt-4 text-base text-gray-600">{edition.summary}</p>
        )}
      </header>

      {CATEGORY_ORDER.map((cat) => {
        const list = grouped.get(cat);
        if (!list || list.length === 0) return null;
        return (
          <section key={cat} className="mb-12">
            <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-gray-500">
              {CATEGORY_LABEL[cat]} · {list.length}
            </h2>
            <ol className="space-y-8">
              {list.map((it, idx) => (
                <li
                  key={it.id}
                  className="rounded-lg border border-gray-200 bg-white p-6"
                >
                  <div className="flex items-baseline gap-3">
                    <span className="font-mono text-xs text-gray-400">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <h3 className="text-xl font-bold leading-snug">
                      {it.headline}
                    </h3>
                  </div>

                  {it.lead && (
                    <p className="mt-3 text-base font-medium text-gray-800">
                      {it.lead}
                    </p>
                  )}

                  {it.body && (
                    <div className="mt-4 space-y-3 whitespace-pre-line text-[15px] leading-relaxed text-gray-800">
                      {it.body}
                    </div>
                  )}

                  {(it.why_it_matters || it.what_to_watch) && (
                    <dl className="mt-5 grid grid-cols-1 gap-3 rounded-md bg-gray-50 p-4 text-sm sm:grid-cols-2">
                      {it.why_it_matters && (
                        <div>
                          <dt className="font-bold uppercase tracking-wide text-xs text-gray-500">
                            Proč to dnes řešíme
                          </dt>
                          <dd className="mt-1 text-gray-800">{it.why_it_matters}</dd>
                        </div>
                      )}
                      {it.what_to_watch && (
                        <div>
                          <dt className="font-bold uppercase tracking-wide text-xs text-gray-500">
                            Co sledovat
                          </dt>
                          <dd className="mt-1 text-gray-800">{it.what_to_watch}</dd>
                        </div>
                      )}
                    </dl>
                  )}

                  {(() => {
                    const srcs = sourcesByItem.get(it.id) ?? [];
                    if (srcs.length === 0) return null;
                    return (
                      <div className="mt-5 border-t border-gray-100 pt-3">
                        <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                          Zdroje · {srcs.length}
                        </p>
                        <ul className="mt-2 space-y-1 text-sm">
                          {srcs.map((s) => (
                            <li key={s.id}>
                              {s.source_url ? (
                                <a
                                  href={s.source_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-700 hover:underline"
                                >
                                  {s.source_title ?? s.source_name ?? s.source_url}
                                </a>
                              ) : (
                                <span className="text-gray-700">
                                  {s.source_title ?? s.source_name}
                                </span>
                              )}
                              {s.source_name && s.source_title && (
                                <span className="text-gray-500"> · {s.source_name}</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })()}
                </li>
              ))}
            </ol>
          </section>
        );
      })}
    </main>
  );
}
