import type { NovinyArticleWithRelations } from "@/lib/noviny/types";
import { decodeHtmlEntities, normalizeWhitespace, stripHtmlToText } from "@/lib/noviny/text";

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
  const source = edited && edited.length > 0 ? edited : article.title;
  return normalizeWhitespace(decodeHtmlEntities(source));
}

export function getVisibleArticlePerex(
  article: Pick<NovinyArticleWithRelations, "edited_perex" | "perex">,
): string | null {
  const edited = article.edited_perex?.trim();
  if (edited) return normalizeWhitespace(decodeHtmlEntities(edited));
  const original = article.perex?.trim();
  return original && original.length > 0 ? normalizeWhitespace(decodeHtmlEntities(original)) : null;
}

export function sourceLabel(article: Pick<NovinyArticleWithRelations, "source" | "language">): string {
  const sourceName = normalizeWhitespace(decodeHtmlEntities(article.source?.name ?? "Neznámý zdroj"));
  const language = article.language?.trim();
  return language ? `${sourceName} · ${language.toUpperCase()}` : sourceName;
}

function normalizeForLookup(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function getArticleAuthor(article: Pick<NovinyArticleWithRelations, "external_author">): string | null {
  const author = article.external_author?.trim();
  if (!author) return null;
  return normalizeWhitespace(decodeHtmlEntities(author));
}

const DISPLAY_TAG_RULES: Array<{ tag: string; keywords: string[] }> = [
  { tag: "Politika", keywords: ["vlada", "snemovna", "volb", "prezident", "premier", "minister"] },
  { tag: "Ekonomika", keywords: ["inflac", "ekonom", "rozpocet", "dan", "trh", "invest", "dluh"] },
  { tag: "Zahraničí", keywords: ["eu", "nato", "ukrajin", "rusk", "usa", "slovensko", "polsko"] },
  { tag: "Bezpečnost", keywords: ["valk", "utok", "kriz", "hrozb", "bezpecnost", "armad"] },
  { tag: "Společnost", keywords: ["skol", "zdravot", "rodin", "kultura", "social", "bydlen"] },
  { tag: "Technologie", keywords: ["ai", "umela inteligence", "technolog", "digital", "data"] },
];

export function getDisplayTags(article: NovinyArticleWithRelations): string[] {
  const explicit = (article.tags ?? [])
    .map((tag) => normalizeWhitespace(decodeHtmlEntities(tag)))
    .filter(Boolean);

  const out: string[] = [];
  for (const tag of explicit) {
    if (!out.includes(tag)) out.push(tag);
    if (out.length >= 5) return out;
  }

  const text = normalizeForLookup(
    `${getVisibleArticleTitle(article)} ${getVisibleArticlePerex(article) ?? ""} ${article.category?.name ?? ""}`,
  );

  for (const rule of DISPLAY_TAG_RULES) {
    if (rule.keywords.some((keyword) => text.includes(keyword))) {
      if (!out.includes(rule.tag)) out.push(rule.tag);
      if (out.length >= 5) break;
    }
  }

  if (out.length === 0 && article.category?.name) {
    out.push(normalizeWhitespace(decodeHtmlEntities(article.category.name)));
  }

  return out.slice(0, 5);
}

function sentenceSplit(value: string): string[] {
  return value
    .split(/(?<=[.!?])\s+/)
    .map((part) => normalizeWhitespace(part))
    .filter((part) => part.length >= 18);
}

export function getArticleSummaryBullets(article: NovinyArticleWithRelations): string[] {
  const title = getVisibleArticleTitle(article);
  const perex = getVisibleArticlePerex(article) ?? "";
  const sourceText = `${title}. ${perex}`.trim();
  const plain = stripHtmlToText(sourceText);
  const sentences = sentenceSplit(plain);

  const bullets: string[] = [];
  if (sentences.length > 0) {
    bullets.push(...sentences.slice(0, 3));
  } else if (plain.length > 0) {
    bullets.push(plain.slice(0, 220).trim());
  } else {
    bullets.push(title);
  }

  return bullets.map((bullet) => (bullet.length > 220 ? `${bullet.slice(0, 217).trimEnd()}...` : bullet));
}
