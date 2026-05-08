import {
  JASNE_ZPRAVY_EDITION_TYPE_LABELS,
} from "@/lib/jasneZpravyData";
import type { JasneZpravyEdition } from "@/lib/jasneZpravyTypes";

type EditionMetaProps = {
  edition: JasneZpravyEdition;
  itemCount: number;
};

function formatEditionDate(value: string | null): string {
  if (!value) return "čas neuveden";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "čas neuveden";
  return new Intl.DateTimeFormat("cs-CZ", {
    timeZone: "Europe/Prague",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function EditionMeta({ edition, itemCount }: EditionMetaProps) {
  const dateLabel = formatEditionDate(edition.publishedAt ?? edition.generatedAt);
  const editionLabel = JASNE_ZPRAVY_EDITION_TYPE_LABELS[edition.type];

  return (
    <section className="rounded-2xl border border-[var(--abj-gold-dim)] bg-[rgba(255,255,255,0.92)] p-4 sm:p-5">
      <p className="text-sm text-abj-text2">
        <span className="font-semibold text-abj-text1">{editionLabel}</span>
        {" · "}
        <span>{dateLabel}</span>
      </p>
      <p className="mt-1 text-sm text-abj-text2">{itemCount} zpráv · zdroje otevřené čtenářům</p>
      {edition.summary ? <p className="mt-3 text-sm leading-relaxed text-abj-text1">{edition.summary}</p> : null}
    </section>
  );
}

