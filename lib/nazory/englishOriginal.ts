import { LOCALE_EN, type VeroxLocale } from "@/lib/i18n/config";
import { extractPlainTextFromTipTapJson } from "@/lib/nazory/content";
import type { OpinionArticleRow } from "@/lib/nazory/types";

export const OPINION_ENGLISH_ORIGINAL_KEY = "veroxEnglishOriginal";

export type OpinionEnglishOriginal = {
  title: string;
  perex: string;
  contentJson: Record<string, unknown> | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function stripOpinionEnglishOriginal(contentJson: Record<string, unknown> | null | undefined): Record<string, unknown> {
  if (!isRecord(contentJson)) return { type: "doc", content: [{ type: "paragraph" }] };
  const { [OPINION_ENGLISH_ORIGINAL_KEY]: _englishOriginal, ...rest } = contentJson;
  return rest;
}

export function getOpinionEnglishOriginal(
  contentJson: Record<string, unknown> | null | undefined,
): OpinionEnglishOriginal {
  const source = isRecord(contentJson) ? contentJson[OPINION_ENGLISH_ORIGINAL_KEY] : null;
  if (!isRecord(source)) {
    return {
      title: "",
      perex: "",
      contentJson: null,
    };
  }

  return {
    title: typeof source.title === "string" ? source.title : "",
    perex: typeof source.perex === "string" ? source.perex : "",
    contentJson: isRecord(source.contentJson) ? source.contentJson : null,
  };
}

export function withOpinionEnglishOriginal(
  contentJson: Record<string, unknown>,
  original: OpinionEnglishOriginal,
): Record<string, unknown> {
  const base = stripOpinionEnglishOriginal(contentJson);
  const title = original.title.trim();
  const perex = original.perex.trim();
  const content = original.contentJson;
  const hasContent = Boolean(content && extractPlainTextFromTipTapJson(stripOpinionEnglishOriginal(content)).trim());

  if (!title && !perex && !hasContent) return base;

  return {
    ...base,
    [OPINION_ENGLISH_ORIGINAL_KEY]: {
      title,
      perex,
      contentJson: content ? stripOpinionEnglishOriginal(content) : null,
    },
  };
}

export function hasOpinionEnglishOriginal(article: Pick<OpinionArticleRow, "content_json">): boolean {
  const original = getOpinionEnglishOriginal(article.content_json);
  return Boolean(
    original.title.trim() ||
      original.perex.trim() ||
      (original.contentJson && extractPlainTextFromTipTapJson(original.contentJson).trim()),
  );
}

export function getOpinionArticleDisplay(
  article: OpinionArticleRow,
  locale: VeroxLocale,
): OpinionArticleRow {
  if (locale !== LOCALE_EN) return article;
  const original = getOpinionEnglishOriginal(article.content_json);
  if (!hasOpinionEnglishOriginal(article)) return article;

  return {
    ...article,
    title: original.title.trim() || article.title,
    perex: original.perex.trim() || article.perex,
    content_json: original.contentJson ?? stripOpinionEnglishOriginal(article.content_json),
  };
}
