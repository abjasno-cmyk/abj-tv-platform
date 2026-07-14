import "server-only";

import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

import { translateText } from "@/lib/i18n/translate";
import {
  getOpinionEnglishAutoTranslation,
  hasOpinionEnglishOriginal,
  stripOpinionEnglishOriginal,
  withOpinionEnglishAutoTranslation,
  type OpinionEnglishAutoTranslation,
} from "@/lib/nazory/englishOriginal";
import { extractPlainTextFromTipTapJson } from "@/lib/nazory/content";
import { OPINION_ARTICLE_COLUMNS, OPINION_ARTICLE_STATUS_PUBLISHED, type OpinionArticleRow } from "@/lib/nazory/types";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

type TipTapNode = {
  type?: string;
  text?: string;
  content?: TipTapNode[];
  [key: string]: unknown;
};

type TranslationRunOptions = {
  limit?: number;
  force?: boolean;
  supabase?: SupabaseClient;
};

type TranslateAndStoreResult = "translated" | "skipped-fresh" | "skipped-manual-original";

export type OpinionTranslationReport = {
  checked: number;
  translated: number;
  skippedFresh: number;
  skippedManualOriginal: number;
  failed: number;
  errors: Array<{ articleId: string; title: string; error: string }>;
};

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function buildOpinionTranslationSourceHash(article: Pick<OpinionArticleRow, "title" | "perex" | "content_json">): string {
  const source = {
    title: article.title,
    perex: article.perex,
    contentJson: stripOpinionEnglishOriginal(article.content_json),
  };
  return createHash("sha256").update(stableStringify(source)).digest("hex");
}

function cloneTipTapJson(contentJson: Record<string, unknown>): TipTapNode {
  return JSON.parse(JSON.stringify(stripOpinionEnglishOriginal(contentJson))) as TipTapNode;
}

function collectTextNodes(root: TipTapNode): Array<{ node: TipTapNode; text: string }> {
  const nodes: Array<{ node: TipTapNode; text: string }> = [];
  const walk = (node: TipTapNode) => {
    if (typeof node.text === "string" && node.text.trim()) {
      nodes.push({ node, text: node.text });
    }
    for (const child of node.content ?? []) walk(child);
  };
  walk(root);
  return nodes;
}

function openAiConfig(): { apiKey: string; model: string } | null {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;
  return {
    apiKey,
    model: process.env.VEROX_OPINION_TRANSLATION_MODEL?.trim() || process.env.OPENAI_TRANSLATION_MODEL?.trim() || "gpt-4o-mini",
  };
}

async function translateWithOpenAi(texts: string[], context: string): Promise<string[] | null> {
  const config = openAiConfig();
  if (!config || texts.length === 0) return null;

  const timeoutMs = Number(process.env.VEROX_OPINION_TRANSLATION_TIMEOUT_MS ?? 30_000);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 30_000);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: config.model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are an expert Czech-to-English editorial translator. Translate faithfully, naturally and elegantly. Preserve the author's voice, tone, nuance, argumentation and paragraph-level intent. Do not add facts, remove facts, summarize, censor, explain, or editorialize. Return only valid JSON.",
          },
          {
            role: "user",
            content: JSON.stringify({
              instruction:
                "Translate each item to English. Return JSON as {\"translations\":[...]} with exactly the same number of strings and order.",
              context,
              texts,
            }),
          },
        ],
      }),
    });

    if (!response.ok) return null;
    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    const raw = payload.choices?.[0]?.message?.content;
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { translations?: unknown };
    if (!Array.isArray(parsed.translations) || parsed.translations.length !== texts.length) return null;
    const translations = parsed.translations.map((item) => (typeof item === "string" ? item : ""));
    return translations.every((item) => item.trim()) ? translations : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function chunkTexts(texts: string[]): string[][] {
  const chunks: string[][] = [];
  let current: string[] = [];
  let currentLength = 0;

  for (const text of texts) {
    const nextLength = currentLength + text.length;
    if (current.length > 0 && (current.length >= 30 || nextLength > 7000)) {
      chunks.push(current);
      current = [];
      currentLength = 0;
    }
    current.push(text);
    currentLength += text.length;
  }

  if (current.length > 0) chunks.push(current);
  return chunks;
}

async function translateNonEmptyTextsToEnglish(
  texts: string[],
  context: string,
): Promise<{ provider: string; translations: string[] }> {
  const openAiTranslations: string[] = [];
  let usedOpenAi = true;
  for (const chunk of chunkTexts(texts)) {
    const translated = await translateWithOpenAi(chunk, context);
    if (!translated) {
      usedOpenAi = false;
      break;
    }
    openAiTranslations.push(...translated);
  }

  if (usedOpenAi && openAiTranslations.length === texts.length) {
    return { provider: "openai", translations: openAiTranslations };
  }

  const fallback = await Promise.all(texts.map((text) => translateText(text, "en", 5000)));
  if (fallback.some((translation) => !translation?.trim())) {
    throw new Error("Žádný překladový provider nevrátil kompletní překlad.");
  }
  return {
    provider: "google-translate-fallback",
    translations: fallback.map((translation) => translation ?? ""),
  };
}

async function translateTextsToEnglish(texts: string[], context: string): Promise<{ provider: string; translations: string[] }> {
  const indexedTexts = texts
    .map((text, index) => ({ index, text }))
    .filter((item) => item.text.trim().length > 0);
  if (indexedTexts.length === 0) {
    return { provider: "none", translations: texts.map(() => "") };
  }

  const translated = await translateNonEmptyTextsToEnglish(
    indexedTexts.map((item) => item.text),
    context,
  );
  const translations = texts.map(() => "");
  indexedTexts.forEach((item, index) => {
    translations[item.index] = translated.translations[index] ?? "";
  });
  return { provider: translated.provider, translations };
}

export async function translateOpinionArticleToEnglish(article: OpinionArticleRow): Promise<OpinionEnglishAutoTranslation> {
  const sourceHash = buildOpinionTranslationSourceHash(article);
  const contentJson = cloneTipTapJson(article.content_json);
  const textNodes = collectTextNodes(contentJson);
  const sourceTexts = [article.title, article.perex, ...textNodes.map((item) => item.text)];
  const context = `${article.title}\n\n${article.perex}\n\n${extractPlainTextFromTipTapJson(article.content_json).slice(0, 3000)}`;
  const { provider, translations } = await translateTextsToEnglish(sourceTexts, context);
  const [title, perex, ...bodyTranslations] = translations;

  textNodes.forEach((item, index) => {
    item.node.text = bodyTranslations[index] ?? item.text;
  });

  return {
    status: "generated",
    sourceHash,
    generatedAt: new Date().toISOString(),
    provider,
    title,
    perex,
    contentJson,
  };
}

export async function translateAndStoreOpinionArticle(
  supabase: SupabaseClient,
  article: OpinionArticleRow,
  options: { force?: boolean } = {},
): Promise<TranslateAndStoreResult> {
  const force = options.force === true;

  if (hasOpinionEnglishOriginal(article) && !force) {
    return "skipped-manual-original";
  }

  const sourceHash = buildOpinionTranslationSourceHash(article);
  const existing = getOpinionEnglishAutoTranslation(article.content_json);
  if (!force && existing?.status === "generated" && existing.sourceHash === sourceHash) {
    return "skipped-fresh";
  }

  const translation = await translateOpinionArticleToEnglish(article);
  const nextContentJson = withOpinionEnglishAutoTranslation(article.content_json, translation);
  const update = await supabase.from("opinion_articles").update({ content_json: nextContentJson }).eq("id", article.id);
  if (update.error) throw new Error(update.error.message);
  return "translated";
}

export async function runOpinionAutoTranslation(options: TranslationRunOptions = {}): Promise<OpinionTranslationReport> {
  const limit = Math.max(1, Math.min(50, Math.floor(options.limit ?? 10)));
  const force = options.force === true;
  const supabase = options.supabase ?? createSupabaseServiceClient();
  const report: OpinionTranslationReport = {
    checked: 0,
    translated: 0,
    skippedFresh: 0,
    skippedManualOriginal: 0,
    failed: 0,
    errors: [],
  };

  const { data, error } = await supabase
    .from("opinion_articles")
    .select(OPINION_ARTICLE_COLUMNS)
    .eq("status", OPINION_ARTICLE_STATUS_PUBLISHED)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(Math.max(limit * 4, limit));

  if (error) throw new Error(error.message);

  for (const article of (data ?? []) as OpinionArticleRow[]) {
    if (report.translated >= limit) break;
    report.checked += 1;

    try {
      const result = await translateAndStoreOpinionArticle(supabase, article, { force });
      if (result === "translated") report.translated += 1;
      if (result === "skipped-fresh") report.skippedFresh += 1;
      if (result === "skipped-manual-original") report.skippedManualOriginal += 1;
    } catch (translationError) {
      report.failed += 1;
      report.errors.push({
        articleId: article.id,
        title: article.title,
        error: translationError instanceof Error ? translationError.message : "Překlad článku selhal.",
      });
    }
  }

  return report;
}

export async function runVisibleOpinionAutoTranslation(
  articles: OpinionArticleRow[],
  options: TranslationRunOptions = {},
): Promise<OpinionTranslationReport> {
  const limit = Math.max(1, Math.min(10, Math.floor(options.limit ?? 3)));
  const force = options.force === true;
  const supabase = options.supabase ?? createSupabaseServiceClient();
  const report: OpinionTranslationReport = {
    checked: 0,
    translated: 0,
    skippedFresh: 0,
    skippedManualOriginal: 0,
    failed: 0,
    errors: [],
  };

  for (const article of articles) {
    if (report.translated >= limit) break;
    report.checked += 1;

    try {
      const result = await translateAndStoreOpinionArticle(supabase, article, { force });
      if (result === "translated") report.translated += 1;
      if (result === "skipped-fresh") report.skippedFresh += 1;
      if (result === "skipped-manual-original") report.skippedManualOriginal += 1;
    } catch (translationError) {
      report.failed += 1;
      report.errors.push({
        articleId: article.id,
        title: article.title,
        error: translationError instanceof Error ? translationError.message : "Překlad článku selhal.",
      });
    }
  }

  return report;
}
