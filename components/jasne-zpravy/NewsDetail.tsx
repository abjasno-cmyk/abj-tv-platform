import { SourceList } from "@/components/jasne-zpravy/SourceList";
import type { JasneZpravyItem } from "@/lib/jasneZpravyTypes";

type NewsDetailProps = {
  item: JasneZpravyItem;
};

function splitParagraphs(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(/\n{2,}/g)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

export function NewsDetail({ item }: NewsDetailProps) {
  const bodyParagraphs = splitParagraphs(item.body);

  return (
    <div className="mt-3 space-y-3 rounded-xl border border-[var(--abj-gold-dim)] bg-[rgba(255,255,255,0.8)] p-4">
      {item.lead ? <p className="text-sm leading-relaxed text-abj-text1">{item.lead}</p> : null}

      {bodyParagraphs.length > 0 ? (
        <div className="space-y-3">
          {bodyParagraphs.map((paragraph, index) => (
            <p key={`${item.id}-body-${index}`} className="text-sm leading-relaxed text-abj-text1">
              {paragraph}
            </p>
          ))}
        </div>
      ) : null}

      {item.whyItMatters ? (
        <section className="space-y-1">
          <h4 className="text-xs font-semibold uppercase tracking-[0.08em] text-abj-text2">Proč je to důležité</h4>
          <p className="text-sm leading-relaxed text-abj-text1">{item.whyItMatters}</p>
        </section>
      ) : null}

      {item.whatToWatch ? (
        <section className="space-y-1">
          <h4 className="text-xs font-semibold uppercase tracking-[0.08em] text-abj-text2">Co sledovat dál</h4>
          <p className="text-sm leading-relaxed text-abj-text1">{item.whatToWatch}</p>
        </section>
      ) : null}

      <section className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-[0.08em] text-abj-text2">Zdroje</h4>
        <SourceList sources={item.sources} />
      </section>
    </div>
  );
}

