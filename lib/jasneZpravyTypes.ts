export type JasneZpravyEditionType = "morning" | "noon" | "evening" | "manual";

export type JasneZpravyCategory = "domestic" | "foreign" | "curiosity";

export type NewsEditionRow = {
  id: string;
  edition_type: string | null;
  slug: string | null;
  title: string | null;
  subtitle: string | null;
  summary: string | null;
  status: string | null;
  generated_at: string | null;
  published_at: string | null;
  txt_export: string | null;
  json_export: unknown;
  created_at: string | null;
  updated_at: string | null;
};

export type NewsItemRow = {
  id: string;
  edition_id: string;
  category: string | null;
  rank: number | null;
  slug: string | null;
  headline: string | null;
  short_headline: string | null;
  lead: string | null;
  body: string | null;
  voiceover_text: string | null;
  why_it_matters: string | null;
  what_to_watch: string | null;
  source_count: number | null;
  confidence_score: number | null;
  status: string | null;
  risk_flags: unknown;
  metadata: unknown;
  created_at: string | null;
  updated_at: string | null;
};

export type NewsSourceRow = {
  id: string;
  news_item_id: string;
  source_title: string | null;
  source_name: string | null;
  source_url: string | null;
  published_at: string | null;
  retrieved_at: string | null;
  language: string | null;
  source_type: string | null;
  relevance_score: number | null;
  credibility_note: string | null;
  quote_or_excerpt: string | null;
  metadata: unknown;
};

export type JasneZpravySource = {
  id: string;
  title: string;
  sourceName: string | null;
  sourceUrl: string | null;
  publishedAt: string | null;
  sourceType: string | null;
  quoteOrExcerpt: string | null;
};

export type JasneZpravyItem = {
  id: string;
  editionId: string;
  category: JasneZpravyCategory;
  rank: number;
  slug: string | null;
  headline: string;
  shortHeadline: string | null;
  lead: string | null;
  body: string | null;
  whyItMatters: string | null;
  whatToWatch: string | null;
  sourceCount: number;
  status: "published";
  sources: JasneZpravySource[];
};

export type JasneZpravyEdition = {
  id: string;
  type: JasneZpravyEditionType;
  slug: string | null;
  title: string;
  subtitle: string | null;
  summary: string | null;
  generatedAt: string | null;
  publishedAt: string | null;
};

export type JasneZpravyBundle = {
  edition: JasneZpravyEdition | null;
  items: JasneZpravyItem[];
};

