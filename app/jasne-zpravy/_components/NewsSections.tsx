import Link from "next/link";
import {
  getCategoryLabel,
  orderedCategories,
  toCategoryGroups,
  type NewsItem,
  type NewsSource,
} from "@/lib/jasne-zpravy";
import { ArrowRight } from "@/components/abj/verox-icons";

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
      {categories.map((category) => {
        const sectionItems = [...(grouped.get(category) ?? [])].sort(
          (a, b) => rankForSort(a) - rankForSort(b),
        );
        if (sectionItems.length === 0) return null;

        return (
          <section key={category} className="mb-14">
            <SectionHeading className="mb-6 flex items-center justify-between gap-4 border-b-2 border-verox-line pb-2">
              <span className="vx-kicker text-verox-ink">{getCategoryLabel(category)}</span>
              <span className="vx-meta shrink-0">{sectionItems.length} zpráv</span>
            </SectionHeading>
            <ol className="space-y-6">
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
                      className={`group border-2 bg-verox-card p-5 transition duration-200 ${
                        isCuriosity
                          ? "border-verox-line bg-verox-paper hover:border-verox-orange"
                          : "border-verox-line hover:border-verox-orange"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="vx-badge">{getCategoryLabel(category)}</span>
                          <span className="vx-meta border border-verox-line px-2 py-1 text-verox-ink">
                            #{item.rank ?? nav.position}
                          </span>
                        </div>
                        <span className="vx-meta">{sourceCountLabel(shownSourceCount)}</span>
                      </div>

                      <h3 className="vx-display mt-3 text-verox-ink" style={{ fontSize: "1.35rem", lineHeight: 1.06 }}>
                        {item.short_headline ?? item.headline}
                      </h3>

                      {preview ? <p className="mt-2 leading-relaxed text-verox-charcoal">{preview}</p> : null}

                      {item.why_it_matters ? (
                        <div className="mt-3 border-l-2 border-verox-orange bg-verox-paper px-3 py-2">
                          <p className="vx-kicker text-verox-orangeDeep">Proč to řešíme</p>
                          <p className="mt-1 text-sm leading-relaxed text-verox-charcoal">
                            {truncateText(item.why_it_matters, 180)}
                          </p>
                        </div>
                      ) : null}

                      <div className="mt-4 flex flex-wrap items-center gap-4 border-t-2 border-verox-line pt-3">
                        <Link href={detailHref} className="vx-action">
                          Číst zprávu <ArrowRight size={13} />
                        </Link>
                        {sourcePreview ? (
                          <a
                            href={sourcePreview.source_url ?? detailHref}
                            target={sourcePreview.source_url ? "_blank" : undefined}
                            rel={sourcePreview.source_url ? "noopener noreferrer" : undefined}
                            className="vx-meta hover:text-verox-ink"
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
                    <article className="border-2 border-verox-line bg-verox-card p-5 md:p-7">
                      <header className="border-b-2 border-verox-line pb-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="vx-badge">{getCategoryLabel(category)}</span>
                            <span className="vx-meta border border-verox-line px-2 py-1 text-verox-ink">
                              #{item.rank ?? nav.position}
                            </span>
                            <span className="vx-meta border border-verox-line px-2 py-1 text-verox-ink">
                              {sourceCountLabel(shownSourceCount)}
                            </span>
                          </div>
                          <Link href="#vydani-top" className="vx-meta hover:text-verox-ink">
                            ← Zpět na vydání
                          </Link>
                        </div>
                        <h3
                          className="vx-display mt-3 text-verox-ink"
                          style={{ fontSize: "clamp(1.6rem, 3vw, 2rem)", lineHeight: 1.04 }}
                        >
                          {item.short_headline ?? item.headline}
                        </h3>
                        {itemPreviewLead(item) ? (
                          <p className="mt-2 text-lg leading-relaxed text-verox-charcoal">{itemPreviewLead(item)}</p>
                        ) : null}
                        {editionDateTimeLabel ? (
                          <p className="vx-meta mt-3">Vydání publikováno: {editionDateTimeLabel}</p>
                        ) : null}
                      </header>

                      {detailBullets.length > 0 ? (
                        <section className="mt-5 border-l-2 border-verox-orange bg-verox-paper p-4">
                          <h4 className="vx-kicker text-verox-orangeDeep">Ve 3 bodech</h4>
                          <ul className="mt-2 space-y-2">
                            {detailBullets.map((bullet) => (
                              <li key={`${item.id}-${bullet}`} className="flex gap-2 text-sm leading-relaxed text-verox-charcoal">
                                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 bg-verox-orange" />
                                <span>{bullet}</span>
                              </li>
                            ))}
                          </ul>
                        </section>
                      ) : null}

                      {(item.why_it_matters || item.what_to_watch) ? (
                        <dl className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {item.why_it_matters ? (
                            <div className="border-2 border-verox-line bg-verox-paper p-4">
                              <dt className="vx-kicker text-verox-gray">Proč to řešíme</dt>
                              <dd className="mt-2 text-sm leading-relaxed text-verox-charcoal">{item.why_it_matters}</dd>
                            </div>
                          ) : null}
                          {item.what_to_watch ? (
                            <div className="border-2 border-verox-line bg-verox-paper p-4">
                              <dt className="vx-kicker text-verox-gray">Co sledovat</dt>
                              <dd className="mt-2 text-sm leading-relaxed text-verox-charcoal">{item.what_to_watch}</dd>
                            </div>
                          ) : null}
                        </dl>
                      ) : null}

                      {bodyParagraphs.length > 0 ? (
                        <div className="mt-6 max-w-[74ch] space-y-4 text-[1.05rem] leading-8 text-verox-ink">
                          {bodyParagraphs.map((paragraph) => (
                            <p key={`${item.id}-${paragraph.slice(0, 24)}`}>{paragraph}</p>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-6 leading-relaxed text-verox-charcoal">
                          Detailní text zprávy zatím není dostupný. Vydání obsahuje jen stručný redakční přehled.
                        </p>
                      )}

                      <section id={`sources-${item.id}`} className="mt-6 border-t-2 border-verox-line pt-4">
                        <h4 className="vx-kicker text-verox-gray">Zdroje · {shownSourceCount}</h4>
                        {itemSources.length === 0 ? (
                          <p className="mt-2 text-sm text-verox-charcoal">U této zprávy zatím nejsou uvedeny zdroje.</p>
                        ) : (
                          <ul className="mt-3 space-y-2">
                            {itemSources.map((source) => {
                              const sourceDomain = extractDomain(source.source_url);
                              const title = source.source_title ?? source.source_name ?? source.source_url ?? "Zdroj";
                              return (
                                <li
                                  key={source.id}
                                  className="border-2 border-verox-line bg-verox-paper px-3 py-2 text-sm"
                                >
                                  {source.source_url ? (
                                    <a
                                      href={source.source_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="font-medium text-verox-orangeText hover:underline"
                                    >
                                      {title}
                                    </a>
                                  ) : (
                                    <span className="font-medium text-verox-ink">{title}</span>
                                  )}
                                  {(source.source_name || sourceDomain) ? (
                                    <p className="vx-meta mt-1">{source.source_name ?? sourceDomain}</p>
                                  ) : null}
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </section>

                      <footer className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t-2 border-verox-line pt-4">
                        <div className="flex flex-wrap items-center gap-2">
                          {nav.previous ? (
                            <Link
                              href={`#zprava-${nav.previous.id}`}
                              className="vx-btn vx-btn--ghost-ink vx-btn--sm"
                            >
                              ← Předchozí zpráva
                            </Link>
                          ) : (
                            <span className="vx-btn vx-btn--ghost-ink vx-btn--sm opacity-40">
                              ← Předchozí zpráva
                            </span>
                          )}
                          {nav.next ? (
                            <Link
                              href={`#zprava-${nav.next.id}`}
                              className="vx-btn vx-btn--ghost-ink vx-btn--sm"
                            >
                              Další zpráva →
                            </Link>
                          ) : (
                            <span className="vx-btn vx-btn--ghost-ink vx-btn--sm opacity-40">
                              Další zpráva →
                            </span>
                          )}
                        </div>
                        <Link
                          href={editionSlug ? `/jasne-zpravy/${editionSlug}` : "#vydani-top"}
                          className="vx-action"
                        >
                          Zpět na celé vydání <ArrowRight size={13} />
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
