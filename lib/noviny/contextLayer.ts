import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  createNovinyServiceClient,
  listAdminNovinyArticles,
  listPublicNovinyArticles,
} from "@/lib/noviny/repository";
import {
  getVisibleArticlePerex,
  getVisibleArticleTitle,
  resolveArticleLanguage,
} from "@/lib/noviny/public";
import { normalizeWhitespace, stripHtmlToText } from "@/lib/noviny/text";
import type {
  NovinyArticleContextRow,
  NovinyArticleWithRelations,
  NovinyContextTopicSummary,
  NovinyEntityType,
  NovinyTopicRow,
} from "@/lib/noviny/types";

const ANALYSIS_VERSION = "context-layer-2.0-mvp";

type TopicCatalogItem = {
  slug: string;
  name: string;
  description: string;
  isLongTerm: boolean;
  keywords: string[];
};

type EntityCandidate = {
  slug: string;
  name: string;
  entityType: NovinyEntityType;
  relevance: number;
  evidence: string;
};

type TopicCandidate = TopicCatalogItem & {
  relevance: number;
  evidence: string;
};

export type NovinyContextAnalysis = {
  context: Omit<NovinyArticleContextRow, "article_id" | "analyzed_at">;
  topics: TopicCandidate[];
  entities: EntityCandidate[];
};

export type NovinyContextAnalysisReport = {
  totalArticles: number;
  analyzedArticles: number;
  failedArticles: number;
};

export type NovinyTopicPageData = {
  topic: NovinyTopicRow;
  articles: NovinyArticleWithRelations[];
};

const TOPIC_CATALOG: TopicCatalogItem[] = [
  {
    slug: "ceska-politika",
    name: "Česká politika",
    description: "Domácí politické dění, vláda, opozice, parlament a veřejná správa.",
    isLongTerm: true,
    keywords: ["vláda", "parlament", "sněmovna", "senát", "prezident", "ministr", "volby", "opozice", "praha"],
  },
  {
    slug: "svetova-politika",
    name: "Světová politika",
    description: "Mezinárodní vztahy, geopolitika, diplomacie a konflikty.",
    isLongTerm: true,
    keywords: ["usa", "trump", "biden", "čína", "rusko", "izrael", "írán", "gaza", "nato", "osn", "válka"],
  },
  {
    slug: "evropska-unie",
    name: "Evropská unie",
    description: "Regulace, instituce a politická rozhodnutí Evropské unie.",
    isLongTerm: true,
    keywords: ["evropská unie", "brusel", "eurokomise", "europarlament", "eu", "evropský parlament"],
  },
  {
    slug: "ekonomika-a-trhy",
    name: "Ekonomika a trhy",
    description: "Inflace, rozpočty, daně, trhy, banky a makroekonomické dopady.",
    isLongTerm: true,
    keywords: ["inflace", "rozpočet", "daně", "ekonomika", "trh", "bank", "úrok", "dluh", "ceny", "koruna"],
  },
  {
    slug: "energie-a-prumysl",
    name: "Energie a průmysl",
    description: "Energetika, ceny energií, průmysl, infrastruktura a suroviny.",
    isLongTerm: true,
    keywords: ["energie", "plyn", "ropa", "elektřina", "jádro", "uheln", "průmysl", "suroviny"],
  },
  {
    slug: "bezpecnost-a-konflikty",
    name: "Bezpečnost a konflikty",
    description: "Války, obrana, zpravodajské služby, terorismus a bezpečnost státu.",
    isLongTerm: true,
    keywords: ["bezpečnost", "armáda", "obrana", "voják", "útok", "teror", "zpravodaj", "raketa", "dron"],
  },
  {
    slug: "svoboda-slova-a-media",
    name: "Svoboda slova a média",
    description: "Média, cenzura, svoboda projevu, platformy a veřejná debata.",
    isLongTerm: true,
    keywords: ["média", "novinář", "cenzura", "svoboda slova", "platforma", "sociální sítě", "dezinformace"],
  },
  {
    slug: "ai-a-technologie",
    name: "AI a technologie",
    description: "Umělá inteligence, digitalizace, kyberbezpečnost a technologické dopady.",
    isLongTerm: true,
    keywords: ["ai", "umělá inteligence", "technologie", "kyber", "software", "data", "algoritmus"],
  },
  {
    slug: "spolecnost-a-kultura",
    name: "Společnost a kultura",
    description: "Společenské trendy, vzdělávání, hodnoty, kultura a veřejné mínění.",
    isLongTerm: true,
    keywords: ["společnost", "škola", "vzdělávání", "kultura", "hodnoty", "rodina", "mladí", "veřejnost"],
  },
];

const COUNTRY_ENTITIES: Array<{ name: string; keywords: string[] }> = [
  { name: "Česko", keywords: ["česko", "česká republika", "český", "česká"] },
  { name: "Slovensko", keywords: ["slovensko", "slovenský", "slovenská"] },
  { name: "Ukrajina", keywords: ["ukrajina", "ukrajinský", "ukrajinská", "kyjev"] },
  { name: "Rusko", keywords: ["rusko", "ruský", "ruská", "kreml"] },
  { name: "Spojené státy", keywords: ["usa", "spojené státy", "washington"] },
  { name: "Čína", keywords: ["čína", "čínský", "peking"] },
  { name: "Izrael", keywords: ["izrael", "izraelský"] },
  { name: "Německo", keywords: ["německo", "německý", "berlín"] },
  { name: "Francie", keywords: ["francie", "francouzský", "paříž"] },
  { name: "Velká Británie", keywords: ["británie", "britský", "londýn"] },
];

const INSTITUTION_ENTITIES: Array<{ name: string; keywords: string[] }> = [
  { name: "Evropská unie", keywords: ["evropská unie", "eu", "brusel"] },
  { name: "NATO", keywords: ["nato", "severoatlantická aliance"] },
  { name: "OSN", keywords: ["osn", "organizace spojených národů"] },
  { name: "Evropská komise", keywords: ["evropská komise", "eurokomise"] },
  { name: "Česká vláda", keywords: ["vláda", "česká vláda", "kabinet"] },
  { name: "Česká národní banka", keywords: ["čnb", "česká národní banka"] },
];

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

function metadataText(article: NovinyArticleWithRelations): string {
  const metadata = article.metadata ?? {};
  const parts = [
    typeof metadata.summary_source_text === "string" ? metadata.summary_source_text : "",
    typeof metadata.preview_description === "string" ? metadata.preview_description : "",
    typeof metadata.preview_title === "string" ? metadata.preview_title : "",
  ];
  return normalizeWhitespace(parts.map(stripHtmlToText).filter(Boolean).join(" "));
}

function articleText(article: NovinyArticleWithRelations): string {
  return normalizeWhitespace(
    [
      getVisibleArticleTitle(article),
      getVisibleArticlePerex(article) ?? "",
      article.source?.name ?? "",
      metadataText(article),
      article.tags.join(" "),
    ].join(" "),
  );
}

function includesAny(haystack: string, keywords: string[]): boolean {
  return keywords.some((keyword) => haystack.includes(keyword.toLowerCase()));
}

function pickEvidence(text: string, keywords: string[]): string {
  const sentences = normalizeWhitespace(text)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  return (
    sentences.find((sentence) => includesAny(sentence.toLowerCase(), keywords)) ??
    sentences[0] ??
    text.slice(0, 180)
  ).slice(0, 260);
}

function detectContentType(article: NovinyArticleWithRelations, lowerText: string): string {
  const title = getVisibleArticleTitle(article).toLowerCase();
  if (title.includes("rozhovor") || lowerText.includes(" rozhovor ")) return "interview";
  if (title.includes("komentář") || title.includes("názor") || lowerText.includes(" komentář ")) return "opinion";
  if (title.includes("analýza") || lowerText.includes(" analýza ")) return "analysis";
  if (title.includes("video") || lowerText.includes(" video ")) return "video";
  return "article";
}

function scoreTopics(text: string, lowerText: string): TopicCandidate[] {
  return TOPIC_CATALOG.map((topic) => {
    const matches = topic.keywords.filter((keyword) => lowerText.includes(keyword.toLowerCase()));
    return {
      ...topic,
      relevance: Math.min(1, 0.25 + matches.length * 0.18),
      evidence: matches.length > 0 ? pickEvidence(text, matches) : "",
    };
  })
    .filter((topic) => topic.relevance >= 0.43)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 4);
}

function detectKnownEntities(text: string, lowerText: string): EntityCandidate[] {
  const countries = COUNTRY_ENTITIES.filter((entity) => includesAny(lowerText, entity.keywords)).map((entity) => ({
    slug: slugify(entity.name),
    name: entity.name,
    entityType: "country" as const,
    relevance: 0.78,
    evidence: pickEvidence(text, entity.keywords),
  }));

  const institutions = INSTITUTION_ENTITIES.filter((entity) => includesAny(lowerText, entity.keywords)).map((entity) => ({
    slug: slugify(entity.name),
    name: entity.name,
    entityType: "institution" as const,
    relevance: 0.72,
    evidence: pickEvidence(text, entity.keywords),
  }));

  return [...countries, ...institutions];
}

function detectPersonEntities(text: string): EntityCandidate[] {
  const ignored = new Set([
    "Verox Noviny",
    "Česká Republika",
    "Evropská Unie",
    "Spojené Státy",
    "Velká Británie",
  ]);
  const matches = Array.from(
    text.matchAll(/\b[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ][a-záčďéěíňóřšťúůýž]+(?:\s+[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ][a-záčďéěíňóřšťúůýž]+){1,2}\b/g),
  )
    .map((match) => match[0])
    .filter((value) => !ignored.has(value));

  return Array.from(new Set(matches))
    .slice(0, 6)
    .map((name) => ({
      slug: slugify(name),
      name,
      entityType: "person" as const,
      relevance: 0.58,
      evidence: pickEvidence(text, [name]),
    }));
}

function buildShortSummary(article: NovinyArticleWithRelations, text: string): string | null {
  const perex = getVisibleArticlePerex(article);
  const sourceText = metadataText(article);
  const candidate = normalizeWhitespace(sourceText || perex || "");
  if (candidate.length < 90) return null;
  const titleWords = new Set(
    getVisibleArticleTitle(article)
      .toLowerCase()
      .split(/\W+/)
      .filter((word) => word.length > 4),
  );
  const sentence = candidate
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .find((item) => {
      if (item.length < 80 || item.length > 260) return false;
      const overlap = item
        .toLowerCase()
        .split(/\W+/)
        .filter((word) => titleWords.has(word)).length;
      return overlap < Math.max(4, titleWords.size * 0.65);
    });
  return sentence ?? text.slice(0, 240);
}

function buildWhyImportant(topics: TopicCandidate[], entities: EntityCandidate[]): string | null {
  const topic = topics[0];
  if (!topic) return null;
  const entityNames = entities.slice(0, 2).map((entity) => entity.name);
  if (entityNames.length > 0) {
    return `Téma ${topic.name.toLowerCase()} je zde propojeno s aktéry ${entityNames.join(" a ")}, proto může ovlivňovat širší politický nebo společenský kontext.`;
  }
  return `Téma ${topic.name.toLowerCase()} má dlouhodobý dopad na veřejnou debatu a pomáhá čtenáři zasadit jednotlivou zprávu do širšího obrazu.`;
}

function calculateVeroxRelevance(
  topics: TopicCandidate[],
  entities: EntityCandidate[],
  lowerText: string,
): number {
  let score = 20;
  score += Math.min(35, topics.reduce((sum, topic) => sum + topic.relevance * 10, 0));
  score += Math.min(25, entities.length * 4);
  if (lowerText.includes("svoboda slova") || lowerText.includes("cenzura")) score += 12;
  if (lowerText.includes("bezpečnost") || lowerText.includes("válka")) score += 10;
  if (lowerText.includes("ekonomika") || lowerText.includes("inflace")) score += 8;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function analyzeNovinyArticleContext(article: NovinyArticleWithRelations): NovinyContextAnalysis {
  const text = articleText(article);
  const lowerText = text.toLowerCase();
  const topics = scoreTopics(text, lowerText);
  const knownEntities = detectKnownEntities(text, lowerText);
  const people = detectPersonEntities(`${getVisibleArticleTitle(article)} ${getVisibleArticlePerex(article) ?? ""}`);
  const entityBySlug = new Map<string, EntityCandidate>();
  for (const entity of [...knownEntities, ...people]) {
    if (!entity.slug || entityBySlug.has(entity.slug)) continue;
    entityBySlug.set(entity.slug, entity);
  }
  const entities = Array.from(entityBySlug.values()).slice(0, 10);
  const contentType = detectContentType(article, lowerText);
  const shortSummary = buildShortSummary(article, text);
  const sourceName = article.source?.name ?? "Původní zdroj";
  const safeAttribution = shortSummary ? `${sourceName} uvádí: ${shortSummary}` : null;

  return {
    context: {
      status: topics.length > 0 || entities.length > 0 ? "ok" : "partial",
      content_type: contentType,
      main_theme: topics[0]?.name ?? null,
      short_summary: shortSummary,
      safe_attribution: safeAttribution,
      why_important: buildWhyImportant(topics, entities),
      verox_relevance: calculateVeroxRelevance(topics, entities, lowerText),
      suggested_tags: Array.from(new Set([...topics.map((topic) => topic.name), ...article.tags])).slice(0, 8),
      analysis_version: ANALYSIS_VERSION,
      metadata: {
        language: resolveArticleLanguage(article),
        analyzer: "deterministic-context-layer",
        topic_slugs: topics.map((topic) => topic.slug),
        entity_slugs: entities.map((entity) => entity.slug),
      },
    },
    topics,
    entities,
  };
}

async function upsertTopic(supabase: SupabaseClient, topic: TopicCandidate): Promise<string> {
  const { data, error } = await supabase
    .from("noviny_topics")
    .upsert(
      {
        slug: topic.slug,
        name: topic.name,
        description: topic.description,
        is_long_term: topic.isLongTerm,
        metadata: { source: "context-layer-2.0" },
      },
      { onConflict: "slug" },
    )
    .select("id")
    .single();
  if (error) throw error;
  return String((data as Record<string, unknown>).id);
}

async function upsertEntity(supabase: SupabaseClient, entity: EntityCandidate): Promise<string> {
  const { data, error } = await supabase
    .from("noviny_entities")
    .upsert(
      {
        slug: entity.slug,
        name: entity.name,
        entity_type: entity.entityType,
        metadata: { source: "context-layer-2.0" },
      },
      { onConflict: "slug" },
    )
    .select("id")
    .single();
  if (error) throw error;
  return String((data as Record<string, unknown>).id);
}

export async function upsertNovinyArticleContext(
  supabase: SupabaseClient,
  article: NovinyArticleWithRelations,
  analysis: NovinyContextAnalysis,
): Promise<void> {
  const { error: contextError } = await supabase.from("noviny_article_context").upsert(
    {
      article_id: article.id,
      ...analysis.context,
      analyzed_at: new Date().toISOString(),
    },
    { onConflict: "article_id" },
  );
  if (contextError) throw contextError;

  const [topicIds, entityIds] = await Promise.all([
    Promise.all(analysis.topics.map(async (topic) => ({ topic, id: await upsertTopic(supabase, topic) }))),
    Promise.all(analysis.entities.map(async (entity) => ({ entity, id: await upsertEntity(supabase, entity) }))),
  ]);

  const [topicDelete, entityDelete] = await Promise.all([
    supabase.from("noviny_article_topics").delete().eq("article_id", article.id),
    supabase.from("noviny_article_entities").delete().eq("article_id", article.id),
  ]);
  if (topicDelete.error) throw topicDelete.error;
  if (entityDelete.error) throw entityDelete.error;

  if (topicIds.length > 0) {
    const { error } = await supabase.from("noviny_article_topics").insert(
      topicIds.map(({ topic, id }) => ({
        article_id: article.id,
        topic_id: id,
        relevance: topic.relevance,
        evidence: topic.evidence,
      })),
    );
    if (error) throw error;
  }

  if (entityIds.length > 0) {
    const { error } = await supabase.from("noviny_article_entities").insert(
      entityIds.map(({ entity, id }) => ({
        article_id: article.id,
        entity_id: id,
        relevance: entity.relevance,
        evidence: entity.evidence,
      })),
    );
    if (error) throw error;
  }
}

export async function runNovinyContextAnalysis(limit = 250): Promise<NovinyContextAnalysisReport> {
  const supabase = createNovinyServiceClient();
  const articles = (await listAdminNovinyArticles(supabase, limit)).filter(
    (article) => !article.is_hidden && Boolean(article.published_at),
  );
  let analyzedArticles = 0;
  let failedArticles = 0;

  for (const article of articles) {
    try {
      const analysis = analyzeNovinyArticleContext(article);
      await upsertNovinyArticleContext(supabase, article, analysis);
      analyzedArticles += 1;
    } catch {
      failedArticles += 1;
    }
  }

  return {
    totalArticles: articles.length,
    analyzedArticles,
    failedArticles,
  };
}

export async function listNovinyContextTopics(
  supabase: SupabaseClient,
  limit = 12,
): Promise<NovinyContextTopicSummary[]> {
  const { data: topics, error: topicError } = await supabase
    .from("noviny_topics")
    .select("id,slug,name,description,is_long_term")
    .order("name", { ascending: true })
    .limit(Math.max(1, Math.min(50, limit)));
  if (topicError) return [];

  const topicRows = (topics ?? []) as Array<Record<string, unknown>>;
  const topicIds = topicRows.map((topic) => String(topic.id));
  if (topicIds.length === 0) return [];

  const { data: relations, error: relError } = await supabase
    .from("noviny_article_topics")
    .select("topic_id,article_id")
    .in("topic_id", topicIds);
  if (relError) return [];

  const countByTopic = new Map<string, number>();
  for (const relation of relations ?? []) {
    const topicId = String((relation as Record<string, unknown>).topic_id ?? "");
    countByTopic.set(topicId, (countByTopic.get(topicId) ?? 0) + 1);
  }

  return topicRows
    .map((topic) => ({
      id: String(topic.id),
      slug: String(topic.slug),
      name: String(topic.name),
      description: typeof topic.description === "string" ? topic.description : null,
      is_long_term: Boolean(topic.is_long_term),
      article_count: countByTopic.get(String(topic.id)) ?? 0,
    }))
    .filter((topic) => topic.article_count > 0)
    .sort((a, b) => b.article_count - a.article_count || a.name.localeCompare(b.name))
    .slice(0, limit);
}

export async function getNovinyTopicPage(
  supabase: SupabaseClient,
  slug: string,
): Promise<NovinyTopicPageData | null> {
  const { data: topic, error: topicError } = await supabase
    .from("noviny_topics")
    .select("id,slug,name,description,is_long_term,metadata,created_at,updated_at")
    .eq("slug", slug)
    .maybeSingle();
  if (topicError || !topic) return null;

  const topicId = String((topic as Record<string, unknown>).id);
  const { data: relations, error: relError } = await supabase
    .from("noviny_article_topics")
    .select("article_id,relevance")
    .eq("topic_id", topicId)
    .order("relevance", { ascending: false })
    .limit(80);
  if (relError) return null;

  const articleIds = (relations ?? [])
    .map((relation) => String((relation as Record<string, unknown>).article_id ?? ""))
    .filter(Boolean);
  if (articleIds.length === 0) {
    return { topic: topic as NovinyTopicRow, articles: [] };
  }

  return {
    topic: topic as NovinyTopicRow,
    articles: await listPublicNovinyArticles(supabase, { limit: 80, articleIds }),
  };
}
