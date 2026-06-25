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

export function isCzechOrSlovak(language: string | null | undefined): boolean {
  const normalized = (language ?? "").trim().toLowerCase();
  return normalized === "cs" || normalized === "cz" || normalized === "sk" || normalized.startsWith("cs-") || normalized.startsWith("sk-");
}

export function resolveArticleLanguage(article: Pick<NovinyArticleWithRelations, "language" | "source">): string | null {
  return (article.language ?? article.source?.language ?? null)?.trim() ?? null;
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
    .split(/(?<=[.!?])\s+|;\s+|\s+-\s+|,\s+(?=[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ])/)
    .map((part) => normalizeWhitespace(part))
    .filter((part) => part.length >= 16);
}

function toTokenSet(value: string): Set<string> {
  const normalized = normalizeForLookup(value);
  return new Set(
    normalized
      .split(/[^a-z0-9]+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 3),
  );
}

function overlapRatio(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let overlap = 0;
  for (const token of a) {
    if (b.has(token)) overlap += 1;
  }
  return overlap / Math.max(1, Math.min(a.size, b.size));
}

function extractMetadataSummaryText(article: NovinyArticleWithRelations): string {
  const metadata = article.metadata ?? {};
  const maybe = metadata.summary_source_text;
  if (typeof maybe !== "string") return "";
  return normalizeWhitespace(decodeHtmlEntities(maybe));
}

function extractMetadataString(article: NovinyArticleWithRelations, key: string): string | null {
  const metadata = article.metadata ?? {};
  const value = metadata[key];
  if (typeof value !== "string") return null;
  const normalized = normalizeWhitespace(decodeHtmlEntities(value));
  return normalized.length > 0 ? normalized : null;
}

export function getArticlePreviewTitle(article: NovinyArticleWithRelations): string {
  return extractMetadataString(article, "preview_title") ?? getVisibleArticleTitle(article);
}

export function getArticlePreviewDescription(article: NovinyArticleWithRelations): string | null {
  const metadataDescription = extractMetadataString(article, "preview_description");
  if (metadataDescription) return metadataDescription;
  const perex = getVisibleArticlePerex(article);
  if (perex) return perex;
  const summary = extractMetadataSummaryText(article).slice(0, 220).trim();
  return summary.length > 0 ? summary : null;
}

export function getArticleSummaryBullets(article: NovinyArticleWithRelations): string[] {
  const title = getVisibleArticleTitle(article);
  const detailsFromMetadata = extractMetadataSummaryText(article);
  if (detailsFromMetadata.length < 180) {
    return [];
  }

  const plain = stripHtmlToText(detailsFromMetadata);
  if (plain.length < 180) {
    return [];
  }

  const titleTokens = toTokenSet(title);
  const sentences = sentenceSplit(plain).filter((sentence) => overlapRatio(toTokenSet(sentence), titleTokens) < 0.85);

  const unique: string[] = [];
  const seen = new Set<string>();
  for (const sentence of sentences) {
    const normalized = normalizeForLookup(sentence);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    unique.push(sentence);
    if (unique.length >= 8) break;
  }
  const bullets = unique
    .map((bullet) => (bullet.length > 220 ? `${bullet.slice(0, 217).trimEnd()}...` : bullet))
    .filter((bullet) => bullet.length >= 24)
    .slice(0, 5);

  if (bullets.length < 3) {
    return [];
  }

  return bullets;
}
