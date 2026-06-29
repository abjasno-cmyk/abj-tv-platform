import "server-only";

import { createHash } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createNovinyServiceClient, getSourceById, listAdminNovinyArticles } from "@/lib/noviny/repository";
import { getVisibleArticlePerex, getVisibleArticleTitle, isCzechOrSlovak, resolveArticleLanguage } from "@/lib/noviny/public";
import { decodeHtmlEntities, normalizeWhitespace, stripHtmlToText } from "@/lib/noviny/text";
import { translateTextToCzech } from "@/lib/noviny/translation";
import type { NovinyArticleWithRelations, NovinySourceRow } from "@/lib/noviny/types";

const USER_AGENT = "VeroxNovinyBot/1.0 (+https://www.verox.cz)";
const SAFE_AI_TEXT_LIMIT = 10_000;
const DEBUG_EXCERPT_LIMIT = 500;
const DEFAULT_BATCH_LIMIT = 8;
const MAX_RETRIES = 2;

type RobotsRuleGroup = {
  agents: string[];
  disallow: string[];
};

type ExtractedArticleText = {
  text: string;
  method: string;
};

type EnrichmentAiResult = {
  five_point_summary: string[];
  source_attribution_sentence: string;
  content_type: string;
  main_actors: Array<{ name: string; type: string }>;
  topics: string[];
  suggested_tags: string[];
  why_it_matters: string;
  verox_relevance_score: number;
  legal_reputation_risk: number;
};

export type NovinyEnrichmentReport = {
  featureEnabled: boolean;
  processed: number;
  fetched: number;
  blocked: number;
  paywalled: number;
  failed: number;
  skipped: number;
};

const robotsCache = new Map<string, string>();

export const NOVINY_ENRICHMENT_PROMPT = `Pracuj pouze s dodaným textem článku. Nepřidávej žádná nová fakta. Nevydávej tvrzení článku za ověřená fakta. Vždy používej atribuci: podle serveru, autor tvrdí, článek uvádí, v textu zaznívá. Vytvoř pětibodové shrnutí v češtině. Každý bod musí být krátký, věcný a nesmí být delší než 180 znaků.`;

export function isNovinyEnrichmentEnabled(): boolean {
  const raw = process.env.NOVINY_ENRICHMENT_ENABLED;
  if (raw === undefined) return true;
  return ["1", "true", "yes", "on"].includes(raw.trim().toLowerCase());
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function textHash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function parseRobotsRules(content: string): RobotsRuleGroup[] {
  const groups: RobotsRuleGroup[] = [];
  let current: RobotsRuleGroup | null = null;
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.split("#")[0]?.trim() ?? "";
    if (!line) continue;
    const idx = line.indexOf(":");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (key === "user-agent") {
      if (!current || current.disallow.length > 0) {
        current = { agents: [], disallow: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
    } else if (key === "disallow" && current) {
      current.disallow.push(value);
    }
  }
  return groups;
}

function isAllowedByRobotsText(robotsText: string, path: string): boolean {
  if (!robotsText.trim()) return true;
  const groups = parseRobotsRules(robotsText);
  const applicable = groups.filter((group) => group.agents.some((agent) => agent === "*" || agent.includes("verox")));
  if (applicable.length === 0) return true;
  for (const group of applicable) {
    for (const disallow of group.disallow) {
      const rule = disallow.trim();
      if (!rule) continue;
      if (rule === "/") return false;
      if (path.startsWith(rule)) return false;
    }
  }
  return true;
}

async function isAllowedByRobots(url: URL, respectRobots: boolean): Promise<boolean> {
  if (!respectRobots) return true;
  const cacheKey = url.host.toLowerCase();
  let robots = robotsCache.get(cacheKey);
  if (robots === undefined) {
    try {
      const response = await fetch(`${url.protocol}//${url.host}/robots.txt`, {
        method: "GET",
        cache: "force-cache",
        headers: { "User-Agent": USER_AGENT },
      });
      robots = response.ok ? await response.text() : "";
      robotsCache.set(cacheKey, robots);
    } catch {
      robots = "";
      robotsCache.set(cacheKey, robots);
    }
  }
  return isAllowedByRobotsText(robots, url.pathname);
}

export function isLikelyPaywallOrCaptcha(html: string): boolean {
  const lower = html.toLowerCase();
  return [
    "paywall",
    "subscribe to continue",
    "předplaťte",
    "predplatne",
    "premium content",
    "captcha",
    "cf-challenge",
    "cloudflare",
    "access denied",
    "enable javascript",
  ].some((needle) => lower.includes(needle));
}

function stripUnsafeHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
}

function extractJsonLdArticleText(html: string): string | null {
  const scripts = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi) ?? [];
  for (const script of scripts) {
    const content = />\s*([\s\S]*?)\s*<\/script>/i.exec(script)?.[1]?.trim();
    if (!content) continue;
    try {
      const parsed = JSON.parse(content) as unknown;
      const nodes =
        parsed && typeof parsed === "object" && Array.isArray((parsed as Record<string, unknown>)["@graph"])
          ? ((parsed as Record<string, unknown>)["@graph"] as unknown[])
          : Array.isArray(parsed)
            ? parsed
            : [parsed];
      for (const node of nodes) {
        if (!node || typeof node !== "object") continue;
        const record = node as Record<string, unknown>;
        const type = String(record["@type"] ?? "").toLowerCase();
        if (!type.includes("article") && !type.includes("newsarticle")) continue;
        const body = typeof record.articleBody === "string" ? record.articleBody : null;
        if (body && normalizeWhitespace(stripHtmlToText(body)).length >= 500) return body;
      }
    } catch {
      // ignore invalid JSON-LD
    }
  }
  return null;
}

function extractBetween(html: string, tag: "article" | "main"): string | null {
  const pattern = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  return pattern.exec(html)?.[1] ?? null;
}

function extractParagraphText(html: string): string {
  const paragraphs = Array.from(html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi))
    .map((match) => normalizeWhitespace(stripHtmlToText(match[1] ?? "")))
    .filter((value) => value.length >= 40);
  return paragraphs.join("\n\n");
}

export function extractMainArticleText(htmlRaw: string): ExtractedArticleText | null {
  const html = stripUnsafeHtml(htmlRaw);
  const jsonLd = extractJsonLdArticleText(html);
  if (jsonLd) {
    const cleaned = normalizeWhitespace(decodeHtmlEntities(stripHtmlToText(jsonLd)));
    if (cleaned.length >= 500) return { text: cleaned, method: "json-ld-articleBody" };
  }

  const article = extractBetween(html, "article");
  if (article) {
    const text = extractParagraphText(article);
    if (text.length >= 500) return { text, method: "html-article-p" };
  }

  const main = extractBetween(html, "main");
  if (main) {
    const text = extractParagraphText(main);
    if (text.length >= 500) return { text, method: "html-main-p" };
  }

  const bodyText = extractParagraphText(html);
  if (bodyText.length >= 700) return { text: bodyText, method: "html-p-fallback" };
  return null;
}

async function fetchHtmlWithRetry(url: string): Promise<{ status: number; html: string | null; blocked: boolean }> {
  let lastStatus = 0;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch(url, {
        method: "GET",
        cache: "no-store",
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        },
        signal: controller.signal,
      });
      lastStatus = response.status;
      if ([401, 403, 429, 451].includes(response.status)) {
        return { status: response.status, html: null, blocked: true };
      }
      if (!response.ok) {
        if (attempt < MAX_RETRIES && response.status >= 500) {
          await sleep(400 * 2 ** attempt);
          continue;
        }
        return { status: response.status, html: null, blocked: false };
      }
      const contentType = response.headers.get("content-type") ?? "";
      if (contentType && !contentType.toLowerCase().includes("text/html")) {
        return { status: response.status, html: null, blocked: false };
      }
      return { status: response.status, html: await response.text(), blocked: false };
    } catch {
      if (attempt < MAX_RETRIES) {
        await sleep(400 * 2 ** attempt);
        continue;
      }
      return { status: lastStatus, html: null, blocked: false };
    } finally {
      clearTimeout(timeout);
    }
  }
  return { status: lastStatus, html: null, blocked: false };
}

function splitSentences(text: string): string[] {
  return normalizeWhitespace(text)
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => normalizeWhitespace(sentence))
    .filter((sentence) => sentence.length >= 50);
}

function shortenPoint(value: string): string {
  const cleaned = normalizeWhitespace(value.replace(/^[-•\d.)\s]+/, ""));
  return cleaned.length > 180 ? `${cleaned.slice(0, 177).trimEnd()}...` : cleaned;
}

function inferContentType(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("rozhovor")) return "interview";
  if (lower.includes("komentář") || lower.includes("opinion")) return "opinion";
  if (lower.includes("analýza") || lower.includes("analysis")) return "analysis";
  return "article";
}

function inferTopics(text: string): string[] {
  const lower = text.toLowerCase();
  const rules: Array<[string, string[]]> = [
    ["Politika", ["vláda", "parlament", "volby", "ministr", "prezident"]],
    ["Ekonomika", ["inflace", "rozpočet", "daně", "trh", "ekonom"]],
    ["Bezpečnost", ["válka", "útok", "bezpečnost", "armáda", "konflikt"]],
    ["Zahraničí", ["usa", "rusko", "ukrajina", "čína", "nato", "eu"]],
    ["Technologie", ["ai", "umělá inteligence", "technologie", "data"]],
  ];
  return rules.filter(([, words]) => words.some((word) => lower.includes(word))).map(([topic]) => topic).slice(0, 5);
}

function inferEntities(text: string): Array<{ name: string; type: string }> {
  const matches = Array.from(
    text.matchAll(/\b[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ][a-záčďéěíňóřšťúůýž]+(?:\s+[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ][a-záčďéěíňóřšťúůýž]+){1,2}\b/g),
  )
    .map((match) => match[0])
    .filter((name) => !["Podle Serveru", "Číst Původní"].includes(name));
  return Array.from(new Set(matches)).slice(0, 8).map((name) => ({ name, type: "mentioned" }));
}

async function buildSafeLocalAiResult(
  article: NovinyArticleWithRelations,
  source: NovinySourceRow,
  text: string,
): Promise<EnrichmentAiResult> {
  const sentences = splitSentences(text).slice(0, 12);
  const selected = sentences.length >= 5 ? [sentences[0], sentences[1], sentences[2], sentences[3], sentences[4]] : sentences;
  const needsTranslation = !isCzechOrSlovak(resolveArticleLanguage(article));
  const translated = await Promise.all(
    selected.map(async (sentence) => (needsTranslation ? (await translateTextToCzech(sentence, 600)) ?? sentence : sentence)),
  );
  const summary = translated.map(shortenPoint).filter(Boolean).slice(0, 5);
  while (summary.length < 5) {
    summary.push("Text článku neposkytl dostatek bezpečně extrahovatelných detailů pro další samostatný bod.");
  }
  const topics = inferTopics(`${getVisibleArticleTitle(article)} ${text}`);
  const entities = inferEntities(`${getVisibleArticleTitle(article)} ${text}`);

  return {
    five_point_summary: summary,
    source_attribution_sentence: `Podle serveru ${source.name} článek uvádí:`,
    content_type: inferContentType(text),
    main_actors: entities,
    topics,
    suggested_tags: topics,
    why_it_matters: topics.length
      ? `Text je relevantní pro širší kontext tématu ${topics[0].toLowerCase()} a může pomoci zasadit zprávu do souvislostí.`
      : "Text pomáhá zasadit jednotlivou zprávu do širších souvislostí.",
    verox_relevance_score: clamp(35 + topics.length * 10 + entities.length * 2, 0, 100),
    legal_reputation_risk: text.length > 9000 ? 35 : 20,
  };
}

async function buildAiResult(
  article: NovinyArticleWithRelations,
  source: NovinySourceRow,
  text: string,
): Promise<EnrichmentAiResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (apiKey) {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.NOVINY_AI_MODEL?.trim() || "gpt-4o-mini",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `${NOVINY_ENRICHMENT_PROMPT}\nVrať pouze validní JSON s klíči five_point_summary, source_attribution_sentence, content_type, main_actors, topics, suggested_tags, why_it_matters, verox_relevance_score, legal_reputation_risk.`,
          },
          {
            role: "user",
            content: JSON.stringify({
              source: source.name,
              title: getVisibleArticleTitle(article),
              perex: getVisibleArticlePerex(article),
              article_text: text,
            }),
          },
        ],
      }),
    });
    if (!response.ok) {
      throw new Error(`AI API vrátilo HTTP ${response.status}.`);
    }
    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new Error("AI API nevrátilo obsah.");
    const parsed = JSON.parse(content) as Partial<EnrichmentAiResult>;
    const points = Array.isArray(parsed.five_point_summary) ? parsed.five_point_summary.map(String).map(shortenPoint) : [];
    if (points.length !== 5) throw new Error("AI API nevrátilo přesně 5 bodů.");
    return {
      five_point_summary: points,
      source_attribution_sentence:
        typeof parsed.source_attribution_sentence === "string"
          ? parsed.source_attribution_sentence
          : `Podle serveru ${source.name} článek uvádí:`,
      content_type: typeof parsed.content_type === "string" ? parsed.content_type : "article",
      main_actors: Array.isArray(parsed.main_actors) ? parsed.main_actors : [],
      topics: Array.isArray(parsed.topics) ? parsed.topics.map(String).slice(0, 8) : [],
      suggested_tags: Array.isArray(parsed.suggested_tags) ? parsed.suggested_tags.map(String).slice(0, 8) : [],
      why_it_matters: typeof parsed.why_it_matters === "string" ? parsed.why_it_matters : "",
      verox_relevance_score:
        typeof parsed.verox_relevance_score === "number" ? clamp(parsed.verox_relevance_score, 0, 100) : 50,
      legal_reputation_risk:
        typeof parsed.legal_reputation_risk === "number" ? clamp(parsed.legal_reputation_risk, 0, 100) : 25,
    };
  }

  // Bez AI klíče se používá bezpečný lokální návrh, který pracuje pouze s
  // dodaným textem a atribucí. Veřejně se zobrazí až po admin schválení.
  return buildSafeLocalAiResult(article, source, text);
}

async function updateEnrichment(
  supabase: SupabaseClient,
  article: NovinyArticleWithRelations,
  payload: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase.from("noviny_article_enrichment").upsert(
    {
      article_id: article.id,
      source_id: article.source_id,
      ...payload,
    },
    { onConflict: "article_id" },
  );
  if (error) throw error;
}

async function canFetchSourceNow(supabase: SupabaseClient, source: NovinySourceRow): Promise<{ ok: boolean; reason?: string }> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("noviny_article_enrichment")
    .select("id", { count: "exact", head: true })
    .eq("source_id", source.id)
    .gte("fetched_at", since);
  if ((count ?? 0) >= source.max_articles_per_day) {
    return { ok: false, reason: "Denní limit zdroje byl vyčerpán." };
  }

  const { data } = await supabase
    .from("noviny_article_enrichment")
    .select("fetched_at")
    .eq("source_id", source.id)
    .not("fetched_at", "is", null)
    .order("fetched_at", { ascending: false })
    .limit(1);
  const lastFetchedAt = ((data ?? [])[0] as { fetched_at?: string } | undefined)?.fetched_at;
  if (lastFetchedAt) {
    const elapsedSeconds = (Date.now() - new Date(lastFetchedAt).getTime()) / 1000;
    if (elapsedSeconds < source.fetch_delay_seconds) {
      return { ok: false, reason: `Rate limit zdroje: čeká se ${source.fetch_delay_seconds} sekund mezi požadavky.` };
    }
  }
  return { ok: true };
}

export async function enrichNovinyArticle(
  article: NovinyArticleWithRelations,
  opts: { force?: boolean } = {},
): Promise<"fetched" | "blocked" | "paywalled" | "failed" | "skipped"> {
  const supabase = createNovinyServiceClient();
  const source = await getSourceById(supabase, article.source_id);
  if (!source) {
    await updateEnrichment(supabase, article, {
      fetch_status: "failed",
      error_message: "Zdroj článku nebyl nalezen.",
      fetched_at: new Date().toISOString(),
    });
    return "failed";
  }

  if (!isNovinyEnrichmentEnabled()) {
    await updateEnrichment(supabase, article, { fetch_status: "skipped", error_message: "Feature flag je vypnutý." });
    return "skipped";
  }
  if (!source.enrichment_enabled || source.enrichment_mode === "off") {
    await updateEnrichment(supabase, article, { fetch_status: "skipped", error_message: "Enrichment je pro zdroj vypnutý." });
    return "skipped";
  }
  if (source.enrichment_mode === "manual" && !opts.force) {
    await updateEnrichment(supabase, article, { error_message: "Zdroj je nastavený jen na ruční enrichment." });
    return "skipped";
  }
  if (!opts.force) {
    const allowed = await canFetchSourceNow(supabase, source);
    if (!allowed.ok) {
      await updateEnrichment(supabase, article, { error_message: allowed.reason ?? "Rate limit." });
      return "skipped";
    }
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(article.original_url);
  } catch {
    await updateEnrichment(supabase, article, {
      fetch_status: "failed",
      error_message: "Neplatná URL článku.",
      fetched_at: new Date().toISOString(),
    });
    return "failed";
  }

  if (!(await isAllowedByRobots(parsedUrl, source.respect_robots))) {
    await updateEnrichment(supabase, article, {
      fetch_status: "blocked",
      error_message: "Robots.txt nepovoluje čtení této URL.",
      fetched_at: new Date().toISOString(),
    });
    return "blocked";
  }

  const fetched = await fetchHtmlWithRetry(article.original_url);
  const fetchedAt = new Date().toISOString();
  if (fetched.blocked) {
    await updateEnrichment(supabase, article, {
      fetch_status: "blocked",
      fetched_at: fetchedAt,
      error_message: `Zdroj vrátil blokující HTTP status ${fetched.status}.`,
    });
    return "blocked";
  }
  if (!fetched.html) {
    await updateEnrichment(supabase, article, {
      fetch_status: "failed",
      fetched_at: fetchedAt,
      error_message: fetched.status ? `Článek se nepodařilo načíst, HTTP ${fetched.status}.` : "Článek se nepodařilo načíst.",
    });
    return "failed";
  }
  if (isLikelyPaywallOrCaptcha(fetched.html)) {
    await updateEnrichment(supabase, article, {
      fetch_status: "paywalled",
      fetched_at: fetchedAt,
      error_message: "Stránka vypadá jako paywall/captcha/blokace; nepokouším se ji obcházet.",
    });
    return "paywalled";
  }

  const extracted = extractMainArticleText(fetched.html);
  if (!extracted) {
    await updateEnrichment(supabase, article, {
      fetch_status: "failed",
      fetched_at: fetchedAt,
      error_message: "Nepodařilo se bezpečně extrahovat hlavní text článku.",
    });
    return "failed";
  }

  const fullText = normalizeWhitespace(extracted.text);
  const aiInput = fullText.slice(0, SAFE_AI_TEXT_LIMIT);
  try {
    const ai = await buildAiResult(article, source, aiInput);
    await updateEnrichment(supabase, article, {
      fetch_status: "fetched",
      fetched_at: fetchedAt,
      extracted_text_hash: textHash(fullText),
      extracted_text_length: fullText.length,
      extraction_method: extracted.method,
      internal_debug_excerpt: fullText.slice(0, DEBUG_EXCERPT_LIMIT),
      ai_summary_5_points: ai.five_point_summary.slice(0, 5),
      ai_why_it_matters: ai.why_it_matters,
      ai_entities: ai.main_actors,
      ai_topics: ai.topics,
      ai_content_type: ai.content_type,
      ai_relevance_score: ai.verox_relevance_score,
      ai_risk_score: ai.legal_reputation_risk,
      ai_status: "generated",
      error_message: null,
    });
    return "fetched";
  } catch (error) {
    await updateEnrichment(supabase, article, {
      fetch_status: "failed",
      fetched_at: fetchedAt,
      extracted_text_hash: textHash(fullText),
      extracted_text_length: fullText.length,
      extraction_method: extracted.method,
      internal_debug_excerpt: fullText.slice(0, DEBUG_EXCERPT_LIMIT),
      ai_status: "pending",
      error_message: error instanceof Error ? error.message : "AI analýza selhala.",
    });
    return "failed";
  }
}

export async function enrichNovinyArticleById(articleId: string, opts: { force?: boolean } = {}) {
  const supabase = createNovinyServiceClient();
  const articles = await listAdminNovinyArticles(supabase, 500);
  const article = articles.find((item) => item.id === articleId);
  if (!article) throw new Error("Článek nebyl nalezen.");
  return enrichNovinyArticle(article, opts);
}

export async function runNovinyEnrichmentWorker(limit = DEFAULT_BATCH_LIMIT): Promise<NovinyEnrichmentReport> {
  if (!isNovinyEnrichmentEnabled()) {
    return { featureEnabled: false, processed: 0, fetched: 0, blocked: 0, paywalled: 0, failed: 0, skipped: 0 };
  }

  const supabase = createNovinyServiceClient();
  const { data } = await supabase
    .from("noviny_article_enrichment")
    .select("article_id")
    .eq("fetch_status", "pending")
    .order("created_at", { ascending: true })
    .limit(Math.max(1, Math.min(25, limit)));
  const ids = (data ?? []).map((row) => String((row as Record<string, unknown>).article_id)).filter(Boolean);
  const articles = (await listAdminNovinyArticles(supabase, 500)).filter((article) => ids.includes(article.id));

  const report: NovinyEnrichmentReport = {
    featureEnabled: true,
    processed: 0,
    fetched: 0,
    blocked: 0,
    paywalled: 0,
    failed: 0,
    skipped: 0,
  };

  for (const article of articles) {
    const result = await enrichNovinyArticle(article);
    report.processed += 1;
    report[result] += 1;
  }
  return report;
}
