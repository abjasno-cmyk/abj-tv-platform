export const OPINION_ARTICLE_STATUS_DRAFT = "draft" as const;
export const OPINION_ARTICLE_STATUS_PUBLISHED = "published" as const;

export type OpinionArticleStatus =
  | typeof OPINION_ARTICLE_STATUS_DRAFT
  | typeof OPINION_ARTICLE_STATUS_PUBLISHED;

export const VIEWER_COMMENT_ENTITY_OPINION = "opinion" as const;

export type AuthorProfileRow = {
  user_id: string;
  first_name: string;
  last_name: string;
  slug: string;
  bio: string | null;
  title: string | null;
  profession: string | null;
  city: string | null;
  website_url: string | null;
  facebook_url: string | null;
  x_url: string | null;
  linkedin_url: string | null;
  contact_email: string | null;
  avatar_storage_path: string | null;
  is_active: boolean;
  profile_completed: boolean;
  created_at: string;
  updated_at: string;
};

export type PublicAuthorProfile = {
  userId: string;
  firstName: string;
  lastName: string;
  slug: string;
  bio: string | null;
  title: string | null;
  profession: string | null;
  city: string | null;
  websiteUrl: string | null;
  facebookUrl: string | null;
  xUrl: string | null;
  linkedinUrl: string | null;
  avatarStoragePath: string | null;
  publishedArticleCount: number;
};

export type OpinionArticleRow = {
  id: string;
  author_id: string;
  slug: string;
  title: string;
  perex: string;
  hero_image_path: string | null;
  content_json: Record<string, unknown>;
  status: OpinionArticleStatus;
  published_at: string | null;
  deleted_at: string | null;
  reading_time_min: number | null;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
  updated_at: string;
};

export type OpinionArticleDraftInput = {
  title?: string;
  perex?: string;
  contentJson?: Record<string, unknown>;
  heroImagePath?: string | null;
};

export type AuthorProfileInput = {
  firstName: string;
  lastName: string;
  bio?: string | null;
  title?: string | null;
  profession?: string | null;
  city?: string | null;
  websiteUrl?: string | null;
  facebookUrl?: string | null;
  xUrl?: string | null;
  linkedinUrl?: string | null;
  contactEmail?: string | null;
  avatarStoragePath?: string | null;
};

export const AUTHOR_PROFILE_PUBLIC_COLUMNS =
  "user_id, first_name, last_name, slug, bio, title, profession, city, website_url, facebook_url, x_url, linkedin_url, avatar_storage_path, is_active, profile_completed, created_at, updated_at";

export const OPINION_ARTICLE_COLUMNS =
  "id, author_id, slug, title, perex, hero_image_path, content_json, status, published_at, deleted_at, reading_time_min, seo_title, seo_description, created_at, updated_at";
