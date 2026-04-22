const BASE = process.env.NEXT_PUBLIC_REPLIT_URL ?? "";

if (!BASE && typeof window !== "undefined") {
  console.warn("NEXT_PUBLIC_REPLIT_URL není nastaveno — API volání selžou.");
}

export interface ProgramBlock {
  id: string;
  start: string;
  end: string;
  duration_min: number;
  type: "anchor" | "live" | "premiere" | "recorded" | "filler" | "coming_up" | "soft_anchor";
  title: string;
  channel: string;
  video_id: string | null;
  source_type: "ABJ" | "external";
  language: string;
  is_locked: boolean;
  is_draft: boolean;
  tags: string[];
  thumbnail: string | null;
  freshness: string | null;
  urgency: number | null;
  tldr: string | null;
  context: string | null;
  impact: string | null;
  feed_version: string;
}

export interface ProgramResponse {
  date: string;
  feed_version: string;
  generated_by: string;
  timezone: string;
  revision_id: string;
  generated_at: string;
  valid_until: string;
  stale_after: string;
  blocks: ProgramBlock[];
}

export interface FeedPost {
  id: string;
  video_id: string;
  channel_name: string;
  category: string | null;
  language: string;
  headline: string;
  what: string;
  why: string | null;
  impact: string | null;
  quote: string | null;
  quote_author: string | null;
  timestamp_s: number | null;
  freshness: "breaking" | "today" | "week" | "evergreen";
  urgency: 1 | 2 | 3;
  confidence: number;
  has_transcript: boolean;
  tags: string[];
  like_count: number;
  view_count: number;
  comment_count: number;
  video_published_at: string | null;
  created_at: string;
}

export interface FeedResponse {
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
  posts: FeedPost[];
}

export interface HealthResponse {
  status: string;
  version: string;
  timestamp: string;
  quota_used_today: number;
  quota_limit: number;
  cache_only_mode: boolean;
  program_blocks_today: number;
  feed_posts_total: number;
  rebuild_running: boolean;
}

export async function fetchProgram(date?: string): Promise<ProgramResponse | null> {
  if (!BASE) return null;
  const url = date ? `${BASE}/program?date=${encodeURIComponent(date)}` : `${BASE}/program`;
  try {
    const res = await fetch(url, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return (await res.json()) as ProgramResponse;
  } catch {
    return null;
  }
}

export async function fetchTomorrow(): Promise<ProgramResponse | null> {
  if (!BASE) return null;
  try {
    const res = await fetch(`${BASE}/program/tomorrow`);
    if (!res.ok) return null;
    return (await res.json()) as ProgramResponse;
  } catch {
    return null;
  }
}

export async function fetchFeed(params: {
  page?: number;
  per_page?: number;
  freshness?: string;
  urgency?: number;
} = {}): Promise<FeedResponse | null> {
  if (!BASE) return null;
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.per_page) qs.set("per_page", String(params.per_page));
  if (params.freshness) qs.set("freshness", params.freshness);
  if (params.urgency) qs.set("urgency", String(params.urgency));

  try {
    const query = qs.toString();
    const url = query ? `${BASE}/feed?${query}` : `${BASE}/feed`;
    const res = await fetch(url, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as FeedResponse;
  } catch {
    return null;
  }
}

export async function likePost(postId: string): Promise<boolean> {
  if (!BASE) return false;
  try {
    const res = await fetch(`${BASE}/feed/${encodeURIComponent(postId)}/like`, { method: "POST" });
    return res.ok;
  } catch {
    return false;
  }
}

export async function trackView(postId: string): Promise<void> {
  if (!BASE) return;
  try {
    await fetch(`${BASE}/feed/${encodeURIComponent(postId)}/view`, { method: "POST" });
  } catch {
    // Tracking není kritický.
  }
}

export async function fetchHealth(): Promise<HealthResponse | null> {
  if (!BASE) return null;
  try {
    const res = await fetch(`${BASE}/health`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as HealthResponse;
  } catch {
    return null;
  }
}
