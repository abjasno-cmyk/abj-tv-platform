import Link from "next/link";
import {
  getCategoryLabel,
  orderedCategories,
  toCategoryGroups,
  type NewsItem,
  type NewsSource,
} from "@/lib/jasne-zpravy";

type NewsSectionsProps = {
  items: NewsItem[];
  sourcesByItem: Map<string, NewsSource[]>;
  headingLevel?: "h2" | "h3";
  className?: string;
  mode?: "overview" | "detail";
  editionSlug?: string;
  editionDateTimeLabel?: string;
};

function rankForSort(item: NewsItem): number {
  return item.rank ?? Number.MAX_SAFE_INTEGER;
}

function sourceCountLabel(count: number): string {
  if (count === 1) return "1 zdroj";
  if (count > 1 && count < 5) return `${count} zdroje`;
  return `${count} zdrojů`;
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function toParagraphs(text: string | null): string[] {
  if (!text) return [];
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function extractDomain(rawUrl: string | null): string | null {
  if (!rawUrl) return null;
  try {
    const parsed = new URL(rawUrl);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function itemSummaryBullets(item: NewsItem): string[] {
  const bullets: string[] = [];
  const used = new Set<string>();
  const pushUnique = (value: string | null | undefined) => {
    const normalized = value?.trim();
    if (!normalized) return;
    const key = normalized.toLowerCase();
    if (used.has(key)) return;
    used.add(key);
    bullets.push(normalized);
  };

  pushUnique(item.lead);
  pushUnique(item.why_it_matters);
  pushUnique(item.what_to_watch);

  const sentenceCandidates = splitSentences(item.body ?? "");
  for (const sentence of sentenceCandidates) {
    pushUnique(sentence);
    if (bullets.length >= 3) break;
  }
  return bullets.slice(0, 3);
}

function itemPreviewLead(item: NewsItem): string | null {
  const direct = item.lead?.trim();
  if (direct) return direct;
  const sentence = splitSentences(item.body ?? "")[0];
  if (sentence) return truncateText(sentence, 190);
  const fallback = item.short_headline?.trim();
  if (fallback) return fallback;
  return null;
}

function categoryAnchorId(category: NewsItem["category"]): string {
  return `sekce-${category}`;
}

export function NewsSections({
  items,
  sourcesByItem,
  headingLevel = "h2",
  className,
  mode = "overview",
  editionSlug,
  editionDateTimeLabel,
}: NewsSectionsProps) {
  const sortedItems = [...items].sort((a, b) => rankForSort(a) - rankForSort(b));
  const categories = orderedCategories(sortedItems);
  const grouped = toCategoryGroups(sortedItems);
  const orderedFlat = [...sortedItems].sort((a, b) => {
    const byRank = rankForSort(a) - rankForSort(b);
    if (byRank !== 0) return byRank;
    return (a.short_headline ?? a.headline).localeCompare(b.short_headline ?? b.headline, "cs");
  });
  const navById = new Map<
    string,
    {
      previous: NewsItem | null;
      next: NewsItem | null;
      position: number;
    }
  >();
  for (const [index, item] of orderedFlat.entries()) {
    navById.set(item.id, {
      previous: orderedFlat[index - 1] ?? null,
      next: orderedFlat[index + 1] ?? null,
      position: index + 1,
    });
  }
  const SectionHeading = headingLevel;

  return (
    <div className={className}>
      {mode === "detail" && categories.length > 1 ? (
        <nav className="sticky top-20 z-20 mb-6 rounded-2xl border border-gray-200/90 bg-white/95 p-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/80">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500">Výběr kategorií</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <a
              href="#vydani-top"
              className="rounded-full border border-[#FF6A00]/25 bg-[#FF6A00]/10 px-3 py-1.5 text-xs font-semibold text-[#B04A00] hover:bg-[#FF6A00]/15"
            >
              ↑ Nahoru
            </a>
            {categories.map((category) => (
              <a
                key={`nav-${category}`}
                href={`#${categoryAnchorId(category)}`}
                className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-[#FF6A00]/35 hover:text-[#B04A00]"
              >
                {getCategoryLabel(category)}
              </a>
            ))}
          </div>
        </nav>
      ) : null}

      {categories.map((category) => {
        const sectionItems = [...(grouped.get(category) ?? [])].sort(
          (a, b) => rankForSort(a) - rankForSort(b),
        );
        if (sectionItems.length === 0) return null;

        return (
          <section id={categoryAnchorId(category)} key={category} className="mb-12 scroll-mt-28">
            <SectionHeading className="mb-5 flex items-center justify-between text-sm font-bold uppercase tracking-[0.18em] text-gray-600">
              <span>{getCategoryLabel(category)}</span>
              <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] tracking-normal text-gray-600">
                {sectionItems.length} zpráv
              </span>
            </SectionHeading>
            <ol className="space-y-5">
              {sectionItems.map((item, idx) => {
                const itemSources = sourcesByItem.get(item.id) ?? [];
                const shownSourceCount = itemSources.length || item.source_count || 0;
                const nav = navById.get(item.id) ?? {
                  previous: null,
                  next: null,
                  position: idx + 1,
                };
                const isCuriosity = category === "curiosity";
                const preview = itemPreviewLead(item);
                const sourcePreview = itemSources[0] ?? null;
                const sourcePreviewDomain = extractDomain(sourcePreview?.source_url ?? null);
                const detailHref = editionSlug
                  ? `/jasne-zpravy/${editionSlug}#zprava-${item.id}`
                  : `#zprava-${item.id}`;

                if (mode === "overview") {
                  return (
                    <li
                      key={item.id}
                      className={`group rounded-2xl border p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                        isCuriosity
                          ? "border-amber-200/80 bg-amber-50/45 hover:border-amber-300"
                          : "border-gray-200 bg-white hover:border-[#FF6A00]/40"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center rounded-full border border-[#FF6A00]/30 bg-[#FF6A00]/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#B04A00]">
                            {getCategoryLabel(category)}
                          </span>
                          <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-medium text-gray-600">
                            #{item.rank ?? nav.position}
                          </span>
                        </div>
                        <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-medium text-gray-600">
                          {sourceCountLabel(shownSourceCount)}
                        </span>
                      </div>

                      <h3 className="mt-3 text-xl font-black leading-tight text-gray-950">
                        {item.short_headline ?? item.headline}
                      </h3>

                      {preview ? <p className="mt-2 text-[15px] leading-6 text-gray-700">{preview}</p> : null}

                      {item.why_it_matters ? (
                        <div className="mt-3 rounded-xl border border-[#FF6A00]/20 bg-orange-50/60 px-3 py-2">
                          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#B04A00]">
                            Proč to řešíme
                          </p>
                          <p className="mt-1 text-sm leading-6 text-gray-700">
                            {truncateText(item.why_it_matters, 180)}
                          </p>
                        </div>
                      ) : null}

                      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-3">
                        <Link
                          href={detailHref}
                          className="text-sm font-bold uppercase tracking-[0.1em] text-[#FF6A00] hover:text-[#cc5500]"
                        >
                          Číst zprávu →
                        </Link>
                        {sourcePreview ? (
                          <a
                            href={sourcePreview.source_url ?? detailHref}
                            target={sourcePreview.source_url ? "_blank" : undefined}
                            rel={sourcePreview.source_url ? "noopener noreferrer" : undefined}
                            className="text-xs font-medium text-gray-600 hover:text-gray-900"
                          >
                            Zdroje: {sourcePreview.source_name ?? sourcePreview.source_title ?? sourcePreviewDomain ?? "Otevřít"}
                            {shownSourceCount > 1 ? ` +${shownSourceCount - 1}` : ""}
                          </a>
                        ) : null}
                      </div>
                    </li>
                  );
                }

                const detailBullets = itemSummaryBullets(item);
                const bodyParagraphs = toParagraphs(item.body);
                return (
                  <li id={`zprava-${item.id}`} key={item.id} className="scroll-mt-24">
                    <article className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm ring-1 ring-black/[0.02] md:p-7">
                      <header className="border-b border-gray-100 pb-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center rounded-full border border-[#FF6A00]/30 bg-[#FF6A00]/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#B04A00]">
                              {getCategoryLabel(category)}
                            </span>
                            <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-medium text-gray-600">
                              #{item.rank ?? nav.position}
                            </span>
                            <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-medium text-gray-600">
                              {sourceCountLabel(shownSourceCount)}
                            </span>
                          </div>
                          <Link href="#vydani-top" className="text-xs font-semibold text-gray-500 hover:text-gray-900">
                            ← Zpět na vydání
                          </Link>
                        </div>
                        <h3 className="mt-3 text-2xl font-black leading-tight text-gray-950 md:text-[1.9rem]">
                          {item.short_headline ?? item.headline}
                        </h3>
                        {itemPreviewLead(item) ? (
                          <p className="mt-2 text-lg leading-7 text-gray-700">{itemPreviewLead(item)}</p>
                        ) : null}
                        {editionDateTimeLabel ? (
                          <p className="mt-3 text-sm text-gray-500">Vydání publikováno: {editionDateTimeLabel}</p>
                        ) : null}
                      </header>

                      {detailBullets.length > 0 ? (
                        <section className="mt-5 rounded-2xl border border-[#FF6A00]/20 bg-orange-50/55 p-4">
                          <h4 className="text-xs font-bold uppercase tracking-[0.14em] text-[#B04A00]">Ve 3 bodech</h4>
                          <ul className="mt-2 space-y-2">
                            {detailBullets.map((bullet) => (
                              <li key={`${item.id}-${bullet}`} className="flex gap-2 text-sm leading-6 text-gray-800">
                                <span className="mt-[7px] h-1.5 w-1.5 rounded-full bg-[#FF6A00]" />
                                <span>{bullet}</span>
                              </li>
                            ))}
                          </ul>
                        </section>
                      ) : null}

                      {(item.why_it_matters || item.what_to_watch) ? (
                        <dl className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {item.why_it_matters ? (
                            <div className="rounded-xl border border-gray-200 bg-gray-50/90 p-4">
                              <dt className="text-xs font-bold uppercase tracking-[0.12em] text-gray-500">
                                Proč to řešíme
                              </dt>
                              <dd className="mt-2 text-sm leading-6 text-gray-800">{item.why_it_matters}</dd>
                            </div>
                          ) : null}
                          {item.what_to_watch ? (
                            <div className="rounded-xl border border-gray-200 bg-gray-50/90 p-4">
                              <dt className="text-xs font-bold uppercase tracking-[0.12em] text-gray-500">Co sledovat</dt>
                              <dd className="mt-2 text-sm leading-6 text-gray-800">{item.what_to_watch}</dd>
                            </div>
                          ) : null}
                        </dl>
                      ) : null}

                      {bodyParagraphs.length > 0 ? (
                        <div className="mt-6 max-w-[74ch] space-y-4 text-[17px] leading-8 text-gray-900">
                          {bodyParagraphs.map((paragraph) => (
                            <p key={`${item.id}-${paragraph.slice(0, 24)}`}>{paragraph}</p>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-6 text-base leading-7 text-gray-700">
                          Detailní text zprávy zatím není dostupný. Vydání obsahuje jen stručný redakční přehled.
                        </p>
                      )}

                      <section id={`sources-${item.id}`} className="mt-6 border-t border-gray-100 pt-4">
                        <h4 className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500">
                          Zdroje · {shownSourceCount}
                        </h4>
                        {itemSources.length === 0 ? (
                          <p className="mt-2 text-sm text-gray-600">U této zprávy zatím nejsou uvedeny zdroje.</p>
                        ) : (
                          <ul className="mt-3 space-y-2">
                            {itemSources.map((source) => {
                              const sourceDomain = extractDomain(source.source_url);
                              const title = source.source_title ?? source.source_name ?? source.source_url ?? "Zdroj";
                              return (
                                <li
                                  key={source.id}
                                  className="rounded-lg border border-gray-200 bg-gray-50/70 px-3 py-2 text-sm"
                                >
                                  {source.source_url ? (
                                    <a
                                      href={source.source_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="font-medium text-[#1f4f9c] hover:underline"
                                    >
                                      {title}
                                    </a>
                                  ) : (
                                    <span className="font-medium text-gray-800">{title}</span>
                                  )}
                                  {(source.source_name || sourceDomain) ? (
                                    <p className="mt-1 text-xs text-gray-500">{source.source_name ?? sourceDomain}</p>
                                  ) : null}
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </section>

                      <footer className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
                        <div className="flex flex-wrap items-center gap-2">
                          {nav.previous ? (
                            <Link
                              href={`#zprava-${nav.previous.id}`}
                              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-gray-700 hover:border-[#FF6A00]/35 hover:text-[#FF6A00]"
                            >
                              ← Předchozí zpráva
                            </Link>
                          ) : (
                            <span className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs uppercase tracking-[0.08em] text-gray-400">
                              ← Předchozí zpráva
                            </span>
                          )}
                          {nav.next ? (
                            <Link
                              href={`#zprava-${nav.next.id}`}
                              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-gray-700 hover:border-[#FF6A00]/35 hover:text-[#FF6A00]"
                            >
                              Další zpráva →
                            </Link>
                          ) : (
                            <span className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs uppercase tracking-[0.08em] text-gray-400">
                              Další zpráva →
                            </span>
                          )}
                        </div>
                        <Link
                          href={editionSlug ? `/jasne-zpravy/${editionSlug}` : "#vydani-top"}
                          className="text-xs font-semibold uppercase tracking-[0.08em] text-[#FF6A00] hover:text-[#cc5500]"
                        >
                          Zpět na celé vydání
                        </Link>
                      </footer>
                    </article>
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
