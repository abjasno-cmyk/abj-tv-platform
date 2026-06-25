import type { NovinyArticleWithRelations } from "@/lib/noviny/types";

const PRAGUE_TIME_ZONE = "Europe/Prague";

function formatInPrague(value: string | null | undefined, opts: Intl.DateTimeFormatOptions): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  try {
    return new Intl.DateTimeFormat("cs-CZ", {
      timeZone: PRAGUE_TIME_ZONE,
      ...opts,
    }).format(date);
  } catch {
    return "";
  }
}

export function formatNovinyDate(value: string | null | undefined): string {
  return formatInPrague(value, {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getVisibleArticleTitle(article: Pick<NovinyArticleWithRelations, "edited_title" | "title">): string {
  const edited = article.edited_title?.trim();
  return edited && edited.length > 0 ? edited : article.title;
}

export function getVisibleArticlePerex(
  article: Pick<NovinyArticleWithRelations, "edited_perex" | "perex">,
): string | null {
  const edited = article.edited_perex?.trim();
  if (edited) return edited;
  const original = article.perex?.trim();
  return original && original.length > 0 ? original : null;
}

export function sourceLabel(article: Pick<NovinyArticleWithRelations, "source" | "language">): string {
  const sourceName = article.source?.name ?? "Neznámý zdroj";
  const language = article.language?.trim();
  return language ? `${sourceName} · ${language.toUpperCase()}` : sourceName;
}
