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
import { ArrowRight } from "@/components/abj/verox-icons";

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
    <article className="border-2 border-verox-ink bg-verox-card p-5 md:p-7">
      <header className="border-b-2 border-verox-line pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="vx-badge">{getCategoryLabel(item.category)}</span>
          <span className="vx-meta border border-verox-line px-2 py-1 text-verox-ink">
            {sourceCountLabel(sourceCount)}
          </span>
          <span className="vx-meta border border-verox-line px-2 py-1 text-verox-ink">
            {itemReadMinutes(item)} min čtení
          </span>
        </div>
        <h1
          className="vx-display mt-3 text-verox-ink"
          style={{ fontSize: "clamp(1.9rem, 4vw, 2.8rem)", lineHeight: 1.02 }}
        >
          {item.short_headline ?? item.headline}
        </h1>
        <p className="mt-3 text-lg leading-relaxed text-verox-charcoal">{oneLineLead(item)}</p>
        <p className="vx-meta mt-3">
          Publikováno: {formatPragueDateTime(getEditionTimestamp(edition))} • Důvěra {confidence}%
        </p>
        <div className="mt-3 h-1 w-full overflow-hidden bg-verox-paperDeep">
          <div className="h-full bg-verox-orange" style={{ width: `${Math.max(8, confidence)}%` }} />
        </div>
      </header>

      {sections.length > 0 ? (
        <div className="mt-5 space-y-4">
          {sections.map((section) => (
            <section
              key={`${item.id}-${section.key}`}
              className={`border-2 p-4 ${
                section.key === "HOOK"
                  ? "border-verox-orange bg-verox-paper"
                  : section.key === "DOPAD"
                    ? "border-verox-ink bg-verox-paperDeep"
                    : section.key === "POINTA"
                      ? "border-verox-line bg-verox-paper"
                      : "border-verox-line"
              }`}
            >
              <h2 className="vx-kicker text-verox-ink">{SECTION_LABEL[section.key]}</h2>
              <div className="mt-2 space-y-3 leading-relaxed text-verox-ink">
                {section.content.map((paragraph) => (
                  <p key={`${section.key}-${paragraph.slice(0, 24)}`}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : item.body ? (
        <div className="mt-5 space-y-4 leading-relaxed text-verox-ink">
          {item.body
            .split(/\n{2,}/)
            .map((part) => part.trim())
            .filter(Boolean)
            .map((paragraph) => (
              <p key={paragraph.slice(0, 40)}>{paragraph}</p>
            ))}
        </div>
      ) : (
        <p className="mt-5 leading-relaxed text-verox-charcoal">Plné znění zprávy zatím není dostupné.</p>
      )}

      {(item.why_it_matters || item.what_to_watch || item.metadata?.cz_bridge) ? (
        <dl className="mt-6 grid gap-3 md:grid-cols-3">
          {item.why_it_matters ? (
            <div className="border-2 border-verox-line bg-verox-paper p-4">
              <dt className="vx-kicker text-verox-gray">Proč je to důležité</dt>
              <dd className="mt-2 text-sm leading-relaxed text-verox-charcoal">{item.why_it_matters}</dd>
            </div>
          ) : null}
          {item.what_to_watch ? (
            <div className="border-2 border-verox-line bg-verox-paper p-4">
              <dt className="vx-kicker text-verox-gray">Co sledovat dál</dt>
              <dd className="mt-2 text-sm leading-relaxed text-verox-charcoal">{item.what_to_watch}</dd>
            </div>
          ) : null}
          {item.metadata?.cz_bridge ? (
            <div className="border-l-2 border-verox-ink bg-verox-paperDeep p-4">
              <dt className="vx-kicker text-verox-ink">Pro Česko znamená</dt>
              <dd className="mt-2 text-sm leading-relaxed text-verox-charcoal">{item.metadata.cz_bridge}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      {item.metadata?.is_followup ? (
        <div className="mt-5 border-2 border-verox-line bg-verox-paper px-4 py-3 text-sm text-verox-charcoal">
          <p className="vx-kicker text-verox-ink">Souvisí s předchozím vydáním</p>
          <p className="mt-2">
            {relatedHref ? (
              <Link href={relatedHref} className="vx-action">
                Otevřít související zprávu <ArrowRight size={13} />
              </Link>
            ) : (
              "Navazující zpráva je označena, ale odkaz zatím není dostupný."
            )}
          </p>
        </div>
      ) : null}

      {isCrossCheckConflict(item) ? (
        <div className="mt-5 border-l-2 border-verox-orange bg-verox-paper px-4 py-3 text-sm text-verox-charcoal">
          Redakční upozornění: zdroje obsahují konfliktní tvrzení, která vyžadují další ověření.
        </div>
      ) : null}

      <div className="mt-6 space-y-6">
        <SourceList sources={sources} />
        <TransparencyPanel item={item} edition={edition} />
      </div>

      {showBackToEdition ? (
        <footer className="mt-6 border-t-2 border-verox-line pt-4">
          <Link href={`/jasne-zpravy/${edition.slug}#${getItemSlug(item)}`} className="vx-action">
            ← Zpět na vydání
          </Link>
        </footer>
      ) : null}
    </article>
  );
}
