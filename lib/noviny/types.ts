export type NovinyCategoryRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  created_at: string;
};

export type NovinySourceRow = {
  id: string;
  slug: string;
  name: string;
  homepage_url: string | null;
  rss_url: string;
  language: string | null;
  country: string | null;
  category_id: string | null;
  is_active: boolean;
  allow_images: boolean;
  legal_note: string | null;
  last_fetched_at: string | null;
  last_success_at: string | null;
  created_at: string;
  updated_at: string;
};

export type NovinyArticleRow = {
  id: string;
  source_id: string;
  category_id: string | null;
  source_article_id: string | null;
  title: string;
  perex: string | null;
  original_url: string;
  canonical_url: string;
  published_at: string | null;
  image_url: string | null;
  image_usage_safe: boolean;
  external_author: string | null;
  language: string | null;
  is_hidden: boolean;
  edited_title: string | null;
  edited_perex: string | null;
  metadata: Record<string, unknown> | null;
  imported_at: string;
  created_at: string;
  updated_at: string;
};

export type NovinyTagRow = {
  id: string;
  slug: string;
  name: string;
  created_at: string;
};

export type NovinyFetchLogRow = {
  id: string;
  source_id: string | null;
  run_type: "cron" | "manual" | "api";
  status: "success" | "warning" | "error";
  fetched_at: string;
  http_status: number | null;
  imported_count: number;
  deduplicated_count: number;
  skipped_count: number;
  duration_ms: number | null;
  message: string | null;
  error_detail: string | null;
  payload: Record<string, unknown> | null;
};

export type NovinyArticleWithRelations = NovinyArticleRow & {
  source: Pick<NovinySourceRow, "id" | "name" | "slug" | "homepage_url" | "language" | "country"> | null;
  category: Pick<NovinyCategoryRow, "id" | "slug" | "name"> | null;
  tags: string[];
  context?: NovinyArticleContextRow | null;
};

export type NovinyRssArticleInput = {
  sourceArticleId: string | null;
  title: string;
  perex: string | null;
  originalUrl: string;
  canonicalUrl: string;
  publishedAt: string | null;
  imageUrl: string | null;
  imageUsageSafe: boolean;
  externalAuthor: string | null;
  language: string | null;
  metadata: Record<string, unknown>;
};

export type NovinyEntityType = "person" | "institution" | "country" | "place" | "organization" | "other";

export type NovinyEntityRow = {
  id: string;
  slug: string;
  name: string;
  entity_type: NovinyEntityType;
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type NovinyTopicRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  is_long_term: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type NovinyEventRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  starts_at: string | null;
  last_seen_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type NovinyArticleContextRow = {
  article_id: string;
  status: "ok" | "partial" | "failed";
  content_type: string;
  main_theme: string | null;
  short_summary: string | null;
  safe_attribution: string | null;
  why_important: string | null;
  verox_relevance: number;
  suggested_tags: string[];
  analysis_version: string;
  analyzed_at: string;
  metadata: Record<string, unknown>;
};

export type NovinyContextTopicSummary = Pick<
  NovinyTopicRow,
  "id" | "slug" | "name" | "description" | "is_long_term"
> & {
  article_count: number;
};
