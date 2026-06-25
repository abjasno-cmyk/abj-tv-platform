import "server-only";

import { XMLParser } from "fast-xml-parser";

import { decodeHtmlEntities, normalizeWhitespace, stripHtmlToText } from "@/lib/noviny/text";
import type { NovinyRssArticleInput } from "@/lib/noviny/types";
import { normalizeExternalUrl } from "@/lib/noviny/url";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  trimValues: true,
  parseTagValue: false,
});

type RssParseOptions = {
  sourceName: string;
  sourceLanguage: string | null;
  allowImages: boolean;
  maxItems?: number;
};

export type RssParseResult = {
  feedTitle: string | null;
  articles: NovinyRssArticleInput[];
  warnings: string[];
};

function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function pickFirstNonEmpty(values: Array<unknown>): string | null {
  for (const value of values) {
    if (typeof value === "string") {
      const normalized = normalizeWhitespace(decodeHtmlEntities(value));
      if (normalized) return normalized;
    }
  }
  return null;
}

function toIsoDate(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function stripHtml(value: string): string {
  return stripHtmlToText(value);
}

function toPerex(rawValue: unknown): string | null {
  if (typeof rawValue !== "string") return null;
  const plain = stripHtml(rawValue);
  if (!plain) return null;
  if (plain.length <= 260) return plain;
  return `${plain.slice(0, 257).trimEnd()}...`;
}

function pickImageUrl(item: Record<string, unknown>, allowImages: boolean): string | null {
  if (!allowImages) return null;

  const enclosure = item.enclosure;
  if (enclosure && typeof enclosure === "object" && !Array.isArray(enclosure)) {
    const maybeUrl = normalizeExternalUrl(String((enclosure as Record<string, unknown>).url ?? ""));
    if (maybeUrl) return maybeUrl;
  }

  const mediaContent = asArray(item["media:content"]);
  for (const part of mediaContent) {
    if (part && typeof part === "object" && !Array.isArray(part)) {
      const maybeUrl = normalizeExternalUrl(String((part as Record<string, unknown>).url ?? ""));
      if (maybeUrl) return maybeUrl;
    }
  }

  const mediaThumbnail = asArray(item["media:thumbnail"]);
  for (const part of mediaThumbnail) {
    if (part && typeof part === "object" && !Array.isArray(part)) {
      const maybeUrl = normalizeExternalUrl(String((part as Record<string, unknown>).url ?? ""));
      if (maybeUrl) return maybeUrl;
    }
  }

  return null;
}

function parseRss2(
  channelNode: Record<string, unknown>,
  options: Required<Pick<RssParseOptions, "sourceName" | "sourceLanguage" | "allowImages" | "maxItems">>,
): RssParseResult {
  const warnings: string[] = [];
  const feedTitle = pickFirstNonEmpty([channelNode.title]);
  const articles: NovinyRssArticleInput[] = [];
  const seenCanonical = new Set<string>();

  const items = asArray(channelNode.item).slice(0, options.maxItems);
  for (const rawItem of items) {
    if (!rawItem || typeof rawItem !== "object" || Array.isArray(rawItem)) continue;
    const item = rawItem as Record<string, unknown>;

    const title = pickFirstNonEmpty([item.title]);
    const rawOriginal = pickFirstNonEmpty([item.link, item.guid]);
    const originalUrl = rawOriginal ? normalizeExternalUrl(rawOriginal) : null;
    const canonicalUrl = originalUrl;

    if (!title || !canonicalUrl || !originalUrl) {
      warnings.push("Přeskočena RSS položka bez titulku nebo URL.");
      continue;
    }
    if (seenCanonical.has(canonicalUrl)) {
      continue;
    }
    seenCanonical.add(canonicalUrl);

    articles.push({
      sourceArticleId: pickFirstNonEmpty([item.guid]),
      title,
      perex: toPerex(item.description ?? item["content:encoded"] ?? item.summary),
      originalUrl,
      canonicalUrl,
      publishedAt: toIsoDate(item.pubDate ?? item.published),
      imageUrl: pickImageUrl(item, options.allowImages),
      imageUsageSafe: options.allowImages,
      externalAuthor: pickFirstNonEmpty([item["dc:creator"], item.author]),
      language: options.sourceLanguage ?? null,
      metadata: {
        sourceName: options.sourceName,
        parser: "rss2",
      },
    });
  }

  return { feedTitle, articles, warnings };
}

function parseAtom(
  feedNode: Record<string, unknown>,
  options: Required<Pick<RssParseOptions, "sourceName" | "sourceLanguage" | "allowImages" | "maxItems">>,
): RssParseResult {
  const warnings: string[] = [];
  const feedTitle = pickFirstNonEmpty([feedNode.title]);
  const articles: NovinyRssArticleInput[] = [];
  const seenCanonical = new Set<string>();
  const entries = asArray(feedNode.entry).slice(0, options.maxItems);

  for (const rawEntry of entries) {
    if (!rawEntry || typeof rawEntry !== "object" || Array.isArray(rawEntry)) continue;
    const entry = rawEntry as Record<string, unknown>;

    const title = pickFirstNonEmpty([entry.title]);
    const links = asArray(entry.link)
      .map((link) => {
        if (typeof link === "string") return link;
        if (link && typeof link === "object" && !Array.isArray(link)) {
          return String((link as Record<string, unknown>).href ?? "");
        }
        return "";
      })
      .filter(Boolean);
    const rawOriginal = pickFirstNonEmpty([links[0], entry.id]);
    const originalUrl = rawOriginal ? normalizeExternalUrl(rawOriginal) : null;
    const canonicalUrl = originalUrl;
    if (!title || !originalUrl || !canonicalUrl) {
      warnings.push("Přeskočena Atom položka bez titulku nebo URL.");
      continue;
    }

    if (seenCanonical.has(canonicalUrl)) continue;
    seenCanonical.add(canonicalUrl);

    const content = pickFirstNonEmpty([entry.summary, entry.content]);
    articles.push({
      sourceArticleId: pickFirstNonEmpty([entry.id]),
      title,
      perex: toPerex(content),
      originalUrl,
      canonicalUrl,
      publishedAt: toIsoDate(entry.published ?? entry.updated),
      imageUrl: null,
      imageUsageSafe: false,
      externalAuthor: pickFirstNonEmpty([
        (entry.author as Record<string, unknown> | undefined)?.name,
        entry["dc:creator"],
      ]),
      language: options.sourceLanguage ?? null,
      metadata: {
        sourceName: options.sourceName,
        parser: "atom",
      },
    });
  }

  return { feedTitle, articles, warnings };
}

export function parseRssFeed(xml: string, options: RssParseOptions): RssParseResult {
  const maxItems = Math.max(1, Math.min(300, options.maxItems ?? 80));
  const parsed = parser.parse(xml) as Record<string, unknown>;

  const normalizedOptions = {
    sourceName: options.sourceName,
    sourceLanguage: options.sourceLanguage,
    allowImages: options.allowImages,
    maxItems,
  };

  const rssNode = parsed.rss;
  if (rssNode && typeof rssNode === "object" && !Array.isArray(rssNode)) {
    const channel = (rssNode as Record<string, unknown>).channel;
    if (channel && typeof channel === "object" && !Array.isArray(channel)) {
      return parseRss2(channel as Record<string, unknown>, normalizedOptions);
    }
  }

  const feedNode = parsed.feed;
  if (feedNode && typeof feedNode === "object" && !Array.isArray(feedNode)) {
    return parseAtom(feedNode as Record<string, unknown>, normalizedOptions);
  }

  throw new Error("Nepodporovaný RSS/Atom formát.");
}
