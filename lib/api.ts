const BASE = process.env.NEXT_PUBLIC_REPLIT_URL ?? "";
const PROXY_BASE = "/api/replit";

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
  editorial_at?: string | null;
  updated_at?: string | null;
}

export interface FeedResponse {
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
  posts: FeedPost[];
}

type StructuredFeedVideo = {
  video_id: string;
  title: string;
  channel: string;
  published_at: string;
  topics: string[];
  tldr?: string;
  context?: string;
  impact?: string;
  freshness: "breaking" | "today" | "week" | "evergreen";
};

type StructuredFeedResponse = {
  top?: StructuredFeedVideo[];
};

export type FeedEvent = {
  type: "new_post";
  post: FeedPost;
};

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
  const qs = new URLSearchParams();
  if (date) qs.set("date", date);
  const query = qs.toString();
  const url = query ? `${PROXY_BASE}/program?${query}` : `${PROXY_BASE}/program`;
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
  try {
    const res = await fetch(`${PROXY_BASE}/program/tomorrow`);
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
  const mapFreshnessToUrgency = (freshness: FeedPost["freshness"]): FeedPost["urgency"] => {
    if (freshness === "breaking") return 3;
    if (freshness === "today") return 2;
    return 1;
  };

  const mapStructuredFallback = (payload: StructuredFeedResponse): FeedResponse => {
    const rows = Array.isArray(payload.top) ? payload.top : [];
    const posts: FeedPost[] = rows.map((row, index) => {
      const createdAt = row.published_at || new Date(0).toISOString();
      return {
        id: `${row.video_id}-${createdAt}-${index}`,
        video_id: row.video_id,
        channel_name: row.channel || "Neznámý kanál",
        category: null,
        language: "cs",
        headline: row.title || "Bez titulku",
        what: row.tldr || row.title || "",
        why: row.context ?? null,
        impact: row.impact ?? null,
        quote: null,
        quote_author: null,
        timestamp_s: null,
        freshness: row.freshness,
        urgency: mapFreshnessToUrgency(row.freshness),
        confidence: 0.5,
        has_transcript: false,
        tags: Array.isArray(row.topics) ? row.topics : [],
        like_count: 0,
        view_count: 0,
        comment_count: 0,
        video_published_at: row.published_at || null,
        created_at: createdAt,
      };
    });

    return {
      total: posts.length,
      page: 1,
      per_page: posts.length,
      has_more: false,
      posts,
    };
  };

  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.per_page) qs.set("per_page", String(params.per_page));
  if (params.freshness) qs.set("freshness", params.freshness);
  if (params.urgency) qs.set("urgency", String(params.urgency));

  try {
    const query = qs.toString();
    const url = query ? `${PROXY_BASE}/feed?${query}` : `${PROXY_BASE}/feed`;
    const res = await fetch(url, {
      cache: "no-store",
    });
    if (!res.ok) {
      const fallbackRes = await fetch("/feed", { cache: "no-store" });
      if (!fallbackRes.ok) return null;
      const fallbackPayload = (await fallbackRes.json()) as StructuredFeedResponse;
      return mapStructuredFallback(fallbackPayload);
    }
    return (await res.json()) as FeedResponse;
  } catch {
    try {
      const fallbackRes = await fetch("/feed", { cache: "no-store" });
      if (!fallbackRes.ok) return null;
      const fallbackPayload = (await fallbackRes.json()) as StructuredFeedResponse;
      return mapStructuredFallback(fallbackPayload);
    } catch {
      return null;
    }
  }
}

export async function likePost(postId: string): Promise<boolean> {
  try {
    const res = await fetch(`${PROXY_BASE}/feed/${encodeURIComponent(postId)}/like`, { method: "POST" });
    return res.ok;
  } catch {
    return false;
  }
}

export async function trackView(postId: string): Promise<void> {
  try {
    await fetch(`${PROXY_BASE}/feed/${encodeURIComponent(postId)}/view`, { method: "POST" });
  } catch {
    // Tracking není kritický.
  }
}

export async function fetchHealth(): Promise<HealthResponse | null> {
  try {
    const res = await fetch(`${PROXY_BASE}/health`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as HealthResponse;
  } catch {
    return null;
  }
}

export function getReplitBaseUrl(): string {
  return BASE;
}

export function createFeedStream(params: { onEvent: (event: FeedEvent) => void; onError?: () => void }) {
  const streamUrl = `${PROXY_BASE}/feed/stream`;
  const eventSource = new EventSource(streamUrl);

  eventSource.addEventListener("new_post", (event) => {
    try {
      const payload = JSON.parse((event as MessageEvent<string>).data) as FeedPost;
      params.onEvent({ type: "new_post", post: payload });
    } catch {
      // Ignore invalid SSE payloads
    }
  });

  if (params.onError) {
    eventSource.addEventListener("error", () => {
      params.onError?.();
    });
  }

  return () => {
    eventSource.close();
  };
}
