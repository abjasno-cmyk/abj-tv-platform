import Link from "next/link";
import {
  confidencePercent,
  formatPragueDateTime,
  getCategoryLabel,
  getEditionTimestamp,
  getItemSourceCount,
  getItemSlug,
  isCrossCheckConflict,
  itemReadMinutes,
  oneLineLead,
  sourceCountLabel,
  type NewsEdition,
  type NewsItem,
  type NewsSource,
} from "@/lib/jasne-zpravy";
import { SourceList } from "./SourceList";
import { TransparencyPanel } from "./TransparencyPanel";

type StoryDetailProps = {
  item: NewsItem;
  edition: NewsEdition;
  sources: NewsSource[];
  sourcesByItem?: Map<string, NewsSource[]>;
  showBackToEdition?: boolean;
};

type StructuredSection = {
  key: "HOOK" | "FAKT" | "KONTEXT" | "DOPAD" | "POINTA";
  content: string[];
};

const SECTION_LABEL: Record<StructuredSection["key"], string> = {
  HOOK: "HOOK",
  FAKT: "FAKT",
  KONTEXT: "KONTEXT",
  DOPAD: "DOPAD",
  POINTA: "POINTA",
};

function parseBodySections(body: string | null): StructuredSection[] {
  if (!body) return [];
  const paragraphs = body
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

  const sections: StructuredSection[] = [];
  let current: StructuredSection | null = null;

  for (const paragraph of paragraphs) {
    const match = paragraph.match(/^(HOOK|FAKT|KONTEXT|DOPAD|POINTA)\s*[:\-]?\s*(.*)$/i);
    if (match) {
      const key = match[1].toUpperCase() as StructuredSection["key"];
      const firstContent = match[2]?.trim();
      current = { key, content: firstContent ? [firstContent] : [] };
      sections.push(current);
      continue;
    }
    if (current) {
      current.content.push(paragraph);
    }
  }

  return sections.length >= 2 ? sections : [];
}

function followupHref(item: NewsItem, editionSlug: string): string | null {
  const relatedEditionSlug = item.metadata?.related_to_edition_slug?.trim();
  const relatedItemSlug = item.metadata?.related_to_item_slug?.trim();
  if (!relatedEditionSlug && !relatedItemSlug) return null;
  if (relatedEditionSlug && relatedItemSlug) return `/jasne-zpravy/${relatedEditionSlug}/${relatedItemSlug}`;
  if (relatedEditionSlug) return `/jasne-zpravy/${relatedEditionSlug}`;
  return `/jasne-zpravy/${editionSlug}/${relatedItemSlug}`;
}

export function StoryDetail({ item, edition, sources, sourcesByItem, showBackToEdition = true }: StoryDetailProps) {
  const sections = parseBodySections(item.body);
  const sourceCount = getItemSourceCount(item, sourcesByItem);
  const confidence = confidencePercent(item.confidence_score);
  const relatedHref = followupHref(item, edition.slug);

  return (
    <article className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm md:p-7">
      <header className="border-b border-gray-100 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex rounded-full bg-[#FF6A00]/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-[#B04A00]">
            {getCategoryLabel(item.category)}
          </span>
          <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-semibold text-gray-600">
            {sourceCountLabel(sourceCount)}
          </span>
          <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-semibold text-gray-600">
            {itemReadMinutes(item)} min čtení
          </span>
        </div>
        <h1 className="mt-3 text-3xl font-black leading-tight text-gray-950">{item.short_headline ?? item.headline}</h1>
        <p className="mt-2 text-lg leading-7 text-gray-700">{oneLineLead(item)}</p>
        <p className="mt-2 text-sm text-gray-500">
          Publikováno: {formatPragueDateTime(getEditionTimestamp(edition))} • Důvěra {confidence}%
        </p>
        <div className="mt-3 h-1 w-full overflow-hidden rounded bg-gray-100">
          <div className="h-full rounded bg-[#FF6A00]" style={{ width: `${Math.max(8, confidence)}%` }} />
        </div>
      </header>

      {sections.length > 0 ? (
        <div className="mt-5 space-y-4">
          {sections.map((section) => (
            <section
              key={`${item.id}-${section.key}`}
              className={`rounded-2xl p-4 ${
                section.key === "HOOK"
                  ? "border border-[#FF6A00]/25 bg-[#fff7f1]"
                  : section.key === "DOPAD"
                    ? "border border-[#1f4f9c]/25 bg-[#eef4ff]"
                    : section.key === "POINTA"
                      ? "border border-gray-200 bg-gray-50"
                      : "border border-gray-200"
              }`}
            >
              <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-gray-600">{SECTION_LABEL[section.key]}</h2>
              <div className="mt-2 space-y-3 text-base leading-7 text-gray-800">
                {section.content.map((paragraph) => (
                  <p key={`${section.key}-${paragraph.slice(0, 24)}`}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : item.body ? (
        <div className="mt-5 space-y-4 text-base leading-7 text-gray-800">
          {item.body
            .split(/\n{2,}/)
            .map((part) => part.trim())
            .filter(Boolean)
            .map((paragraph) => (
              <p key={paragraph.slice(0, 40)}>{paragraph}</p>
            ))}
        </div>
      ) : (
        <p className="mt-5 text-base leading-7 text-gray-700">Plné znění zprávy zatím není dostupné.</p>
      )}

      {(item.why_it_matters || item.what_to_watch || item.metadata?.cz_bridge) ? (
        <dl className="mt-6 grid gap-3 md:grid-cols-3">
          {item.why_it_matters ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <dt className="text-xs font-bold uppercase tracking-[0.12em] text-gray-500">Proč je to důležité</dt>
              <dd className="mt-2 text-sm leading-6 text-gray-800">{item.why_it_matters}</dd>
            </div>
          ) : null}
          {item.what_to_watch ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <dt className="text-xs font-bold uppercase tracking-[0.12em] text-gray-500">Co sledovat dál</dt>
              <dd className="mt-2 text-sm leading-6 text-gray-800">{item.what_to_watch}</dd>
            </div>
          ) : null}
          {item.metadata?.cz_bridge ? (
            <div className="rounded-xl border border-[#1f4f9c]/25 bg-[#eef4ff] p-4">
              <dt className="text-xs font-bold uppercase tracking-[0.12em] text-[#1f4f9c]">Pro Česko znamená</dt>
              <dd className="mt-2 text-sm leading-6 text-[#1f335c]">{item.metadata.cz_bridge}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      {item.metadata?.is_followup ? (
        <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
          <p className="font-semibold text-gray-900">Souvisí s předchozím vydáním</p>
          <p className="mt-1">
            {relatedHref ? (
              <Link href={relatedHref} className="font-semibold text-[#FF6A00] hover:text-[#cc5500]">
                Otevřít související zprávu →
              </Link>
            ) : (
              "Navazující zpráva je označena, ale odkaz zatím není dostupný."
            )}
          </p>
        </div>
      ) : null}

      {isCrossCheckConflict(item) ? (
        <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Redakční upozornění: zdroje obsahují konfliktní tvrzení, která vyžadují další ověření.
        </div>
      ) : null}

      <div className="mt-6 space-y-6">
        <SourceList sources={sources} />
        <TransparencyPanel item={item} edition={edition} />
      </div>

      {showBackToEdition ? (
        <footer className="mt-6 border-t border-gray-100 pt-4">
          <Link href={`/jasne-zpravy/${edition.slug}#${getItemSlug(item)}`} className="text-sm font-bold text-[#FF6A00] hover:text-[#cc5500]">
            ← Zpět na vydání
          </Link>
        </footer>
      ) : null}
    </article>
  );
}
