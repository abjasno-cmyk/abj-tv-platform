import { LOCALE_EN, type VeroxLocale } from "@/lib/i18n/config";
import { extractPlainTextFromTipTapJson } from "@/lib/nazory/content";
import type { OpinionArticleRow } from "@/lib/nazory/types";

export const OPINION_ENGLISH_ORIGINAL_KEY = "veroxEnglishOriginal";
export const OPINION_ENGLISH_AUTO_TRANSLATION_KEY = "veroxEnglishAutoTranslation";

export type OpinionEnglishOriginal = {
  title: string;
  perex: string;
  contentJson: Record<string, unknown> | null;
};

export type OpinionEnglishAutoTranslation = OpinionEnglishOriginal & {
  status: "generated" | "failed";
  sourceHash: string;
  generatedAt: string;
  provider: string;
  error?: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizedOriginalPayload(original: OpinionEnglishOriginal): Record<string, unknown> | null {
  const title = original.title.trim();
  const perex = original.perex.trim();
  const content = original.contentJson;
  const hasContent = Boolean(content && extractPlainTextFromTipTapJson(stripOpinionEnglishOriginal(content)).trim());
  if (!title && !perex && !hasContent) return null;
  return {
    title,
    perex,
    contentJson: content ? stripOpinionEnglishOriginal(content) : null,
  };
}

function normalizedAutoTranslationPayload(translation: OpinionEnglishAutoTranslation): Record<string, unknown> {
  return {
    status: translation.status,
    sourceHash: translation.sourceHash,
    generatedAt: translation.generatedAt,
    provider: translation.provider,
    error: translation.error ?? null,
    title: translation.title.trim(),
    perex: translation.perex.trim(),
    contentJson: translation.contentJson ? stripOpinionEnglishOriginal(translation.contentJson) : null,
  };
}

export function stripOpinionEnglishOriginal(contentJson: Record<string, unknown> | null | undefined): Record<string, unknown> {
  if (!isRecord(contentJson)) return { type: "doc", content: [{ type: "paragraph" }] };
  const {
    [OPINION_ENGLISH_ORIGINAL_KEY]: _englishOriginal,
    [OPINION_ENGLISH_AUTO_TRANSLATION_KEY]: _englishAutoTranslation,
    ...rest
  } = contentJson;
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

export function getOpinionEnglishAutoTranslation(
  contentJson: Record<string, unknown> | null | undefined,
): OpinionEnglishAutoTranslation | null {
  const source = isRecord(contentJson) ? contentJson[OPINION_ENGLISH_AUTO_TRANSLATION_KEY] : null;
  if (!isRecord(source)) return null;
  const status = source.status === "generated" || source.status === "failed" ? source.status : null;
  const sourceHash = typeof source.sourceHash === "string" ? source.sourceHash : "";
  const generatedAt = typeof source.generatedAt === "string" ? source.generatedAt : "";
  const provider = typeof source.provider === "string" ? source.provider : "unknown";
  if (!status || !sourceHash || !generatedAt) return null;

  return {
    status,
    sourceHash,
    generatedAt,
    provider,
    error: typeof source.error === "string" ? source.error : null,
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
  const autoTranslation = getOpinionEnglishAutoTranslation(contentJson);
  const originalPayload = normalizedOriginalPayload(original);
  const withAuto = autoTranslation
    ? { ...base, [OPINION_ENGLISH_AUTO_TRANSLATION_KEY]: normalizedAutoTranslationPayload(autoTranslation) }
    : base;

  if (!originalPayload) return withAuto;
  return {
    ...withAuto,
    [OPINION_ENGLISH_ORIGINAL_KEY]: originalPayload,
  };
}

export function withOpinionEnglishAutoTranslation(
  contentJson: Record<string, unknown>,
  translation: OpinionEnglishAutoTranslation,
): Record<string, unknown> {
  const base = stripOpinionEnglishOriginal(contentJson);
  const original = getOpinionEnglishOriginal(contentJson);
  const originalPayload = normalizedOriginalPayload(original);
  const withAuto = {
    ...base,
    [OPINION_ENGLISH_AUTO_TRANSLATION_KEY]: normalizedAutoTranslationPayload(translation),
  };
  if (!originalPayload) return withAuto;
  return {
    ...withAuto,
    [OPINION_ENGLISH_ORIGINAL_KEY]: originalPayload,
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

export function hasUsableOpinionEnglishAutoTranslation(article: Pick<OpinionArticleRow, "content_json">): boolean {
  const translation = getOpinionEnglishAutoTranslation(article.content_json);
  return Boolean(
    translation?.status === "generated" &&
      (translation.title.trim() ||
        translation.perex.trim() ||
        (translation.contentJson && extractPlainTextFromTipTapJson(translation.contentJson).trim())),
  );
}

export function getOpinionArticleDisplay(
  article: OpinionArticleRow,
  locale: VeroxLocale,
): OpinionArticleRow {
  if (locale !== LOCALE_EN) return article;
  const original = getOpinionEnglishOriginal(article.content_json);
  if (hasOpinionEnglishOriginal(article)) {
    return {
      ...article,
      title: original.title.trim() || article.title,
      perex: original.perex.trim() || article.perex,
      content_json: original.contentJson ?? stripOpinionEnglishOriginal(article.content_json),
    };
  }

  const autoTranslation = getOpinionEnglishAutoTranslation(article.content_json);
  if (!hasUsableOpinionEnglishAutoTranslation(article) || !autoTranslation) return article;

  return {
    ...article,
    title: autoTranslation.title.trim() || article.title,
    perex: autoTranslation.perex.trim() || article.perex,
    content_json: autoTranslation.contentJson ?? stripOpinionEnglishOriginal(article.content_json),
  };
}
