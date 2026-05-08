import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  JasneZpravyBundle,
  JasneZpravyCategory,
  JasneZpravyEdition,
  JasneZpravyEditionType,
  JasneZpravyItem,
  JasneZpravySource,
  NewsEditionRow,
  NewsItemRow,
  NewsSourceRow,
} from "@/lib/jasneZpravyTypes";

export const JASNE_ZPRAVY_CATEGORY_ORDER: JasneZpravyCategory[] = [
  "domestic",
  "foreign",
  "curiosity",
];

export const JASNE_ZPRAVY_CATEGORY_LABELS: Record<JasneZpravyCategory, string> = {
  domestic: "Domácí",
  foreign: "Zahraničí",
  curiosity: "Kuriozita",
};

export const JASNE_ZPRAVY_EDITION_TYPE_LABELS: Record<JasneZpravyEditionType, string> = {
  morning: "Ranní vydání",
  noon: "Polední vydání",
  evening: "Večerní vydání",
  manual: "Mimořádné vydání",
};

function normalizeText(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeEditionType(value: string | null | undefined): JasneZpravyEditionType {
  if (value === "morning" || value === "noon" || value === "evening" || value === "manual") {
    return value;
  }
  return "manual";
}

function normalizeCategory(value: string | null | undefined): JasneZpravyCategory | null {
  if (value === "domestic" || value === "foreign" || value === "curiosity") {
    return value;
  }
  return null;
}

function mapEdition(row: NewsEditionRow): JasneZpravyEdition {
  const type = normalizeEditionType(row.edition_type);
  return {
    id: row.id,
    type,
    slug: normalizeText(row.slug),
    title: normalizeText(row.title) ?? JASNE_ZPRAVY_EDITION_TYPE_LABELS[type],
    subtitle: normalizeText(row.subtitle),
    summary: normalizeText(row.summary),
    generatedAt: row.generated_at,
    publishedAt: row.published_at,
  };
}

function mapSource(row: NewsSourceRow): JasneZpravySource {
  return {
    id: row.id,
    title: normalizeText(row.source_title) ?? "Zdroj",
    sourceName: normalizeText(row.source_name),
    sourceUrl: normalizeText(row.source_url),
    publishedAt: row.published_at,
    sourceType: normalizeText(row.source_type),
    quoteOrExcerpt: normalizeText(row.quote_or_excerpt),
  };
}

function mapItem(row: NewsItemRow, sources: JasneZpravySource[]): JasneZpravyItem | null {
  const category = normalizeCategory(row.category);
  if (!category) return null;
  if (row.status !== "published") return null;

  return {
    id: row.id,
    editionId: row.edition_id,
    category,
    rank: Number.isFinite(row.rank) ? Number(row.rank) : 9999,
    slug: normalizeText(row.slug),
    headline: normalizeText(row.headline) ?? "Bez titulku",
    shortHeadline: normalizeText(row.short_headline),
    lead: normalizeText(row.lead),
    body: normalizeText(row.body),
    whyItMatters: normalizeText(row.why_it_matters),
    whatToWatch: normalizeText(row.what_to_watch),
    sourceCount: Number.isFinite(row.source_count) ? Number(row.source_count) : sources.length,
    status: "published",
    sources,
  };
}

export async function fetchLatestPublishedJasneZpravy(
  supabase: SupabaseClient
): Promise<JasneZpravyEdition | null> {
  const { data, error } = await supabase
    .from("news_editions")
    .select(
      "id, edition_type, slug, title, subtitle, summary, status, generated_at, published_at, txt_export, json_export, created_at, updated_at"
    )
    .eq("status", "published")
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("generated_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) return null;
  return mapEdition(data as NewsEditionRow);
}

export async function fetchEditionItems(
  supabase: SupabaseClient,
  editionId: string
): Promise<NewsItemRow[]> {
  const { data, error } = await supabase
    .from("news_items")
    .select(
      "id, edition_id, category, rank, slug, headline, short_headline, lead, body, voiceover_text, why_it_matters, what_to_watch, source_count, confidence_score, status, risk_flags, metadata, created_at, updated_at"
    )
    .eq("edition_id", editionId)
    .eq("status", "published")
    .in("category", JASNE_ZPRAVY_CATEGORY_ORDER)
    .order("rank", { ascending: true, nullsFirst: false });

  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as NewsItemRow[];
}

export async function fetchItemSources(
  supabase: SupabaseClient,
  itemIds: string[]
): Promise<Map<string, JasneZpravySource[]>> {
  const byItemId = new Map<string, JasneZpravySource[]>();
  if (itemIds.length === 0) return byItemId;

  const { data, error } = await supabase
    .from("news_sources")
    .select(
      "id, news_item_id, source_title, source_name, source_url, published_at, retrieved_at, language, source_type, relevance_score, credibility_note, quote_or_excerpt, metadata"
    )
    .in("news_item_id", itemIds)
    .order("relevance_score", { ascending: false, nullsFirst: false })
    .order("published_at", { ascending: false, nullsFirst: false });

  if (error) {
    throw new Error(error.message);
  }

  for (const row of (data ?? []) as NewsSourceRow[]) {
    if (!byItemId.has(row.news_item_id)) {
      byItemId.set(row.news_item_id, []);
    }
    byItemId.get(row.news_item_id)?.push(mapSource(row));
  }

  return byItemId;
}

function sortItems(items: JasneZpravyItem[]): JasneZpravyItem[] {
  const categoryOrder = new Map(JASNE_ZPRAVY_CATEGORY_ORDER.map((category, index) => [category, index]));
  return [...items].sort((a, b) => {
    const categoryDelta = (categoryOrder.get(a.category) ?? 99) - (categoryOrder.get(b.category) ?? 99);
    if (categoryDelta !== 0) return categoryDelta;
    return a.rank - b.rank;
  });
}

export async function fetchLatestPublishedJasneZpravyBundle(
  supabase: SupabaseClient
): Promise<JasneZpravyBundle> {
  const edition = await fetchLatestPublishedJasneZpravy(supabase);
  if (!edition) {
    return {
      edition: null,
      items: [],
    };
  }

  const rows = await fetchEditionItems(supabase, edition.id);
  const sourceMap = await fetchItemSources(
    supabase,
    rows.map((row) => row.id)
  );

  const items = rows
    .map((row) => mapItem(row, sourceMap.get(row.id) ?? []))
    .filter((row): row is JasneZpravyItem => Boolean(row));

  return {
    edition,
    items: sortItems(items),
  };
}

