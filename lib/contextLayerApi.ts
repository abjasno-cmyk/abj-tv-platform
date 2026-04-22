export type ContextStatus = "supported" | "conflicting" | "not_found";

export type ContextSource = {
  url: string;
  title: string;
  sourceType: string;
};

export type ContextClaim = {
  id: string;
  timestamp: string;
  timeSeconds: number;
  claimText: string;
  contextText: string;
  status: ContextStatus;
  sourceQualitySummary: string | null;
  sources: ContextSource[];
};

export type PublishedVideo = {
  id: string;
  title: string;
  videoUrl: string;
  youtubeId: string | null;
  thumbnailUrl: string | null;
  publishedAt: string | null;
  durationSeconds: number | null;
};

const API_BASE = "/api/replit";

const videosCache: {
  data: PublishedVideo[] | null;
  promise: Promise<PublishedVideo[]> | null;
} = {
  data: null,
  promise: null,
};

const contextCache = new Map<string, ContextClaim[]>();
const contextPromiseCache = new Map<string, Promise<ContextClaim[]>>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function asList(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!isRecord(payload)) return [];
  const candidates = [payload.videos, payload.items, payload.results, payload.data, payload.rows];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
}

function isPublishedRecord(row: Record<string, unknown>): boolean {
  const boolCandidates = [row.published, row.is_published, row.isPublished];
  for (const value of boolCandidates) {
    if (typeof value === "boolean") return value;
  }

  const statusValue = readString(row.status) ?? readString(row.publication_status) ?? readString(row.visibility);
  if (!statusValue) return true;

  const normalized = statusValue.toLowerCase();
  if (["draft", "private", "internal", "pending", "review_queue"].includes(normalized)) {
    return false;
  }
  return ["published", "public", "live", "ready"].includes(normalized) || normalized.length > 0;
}

function parseTimestampToSeconds(value: string): number {
  const cleaned = value.trim();
  if (!cleaned) return 0;
  const parts = cleaned.split(":").map((part) => Number(part));
  if (parts.some((part) => !Number.isFinite(part) || part < 0)) return 0;

  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 1) {
    return parts[0];
  }
  return 0;
}

function extractYoutubeId(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const directId = /^[a-zA-Z0-9_-]{11}$/.exec(trimmed);
  if (directId) return directId[0];

  try {
    const parsed = new URL(trimmed);
    if (parsed.hostname.includes("youtu.be")) {
      const fromPath = parsed.pathname.replace("/", "").trim();
      return /^[a-zA-Z0-9_-]{11}$/.test(fromPath) ? fromPath : null;
    }
    if (parsed.hostname.includes("youtube.com")) {
      const fromQuery = parsed.searchParams.get("v");
      if (fromQuery && /^[a-zA-Z0-9_-]{11}$/.test(fromQuery)) return fromQuery;
      const segments = parsed.pathname.split("/").filter(Boolean);
      const embedIndex = segments.findIndex((segment) => segment === "embed");
      if (embedIndex >= 0 && segments[embedIndex + 1]) {
        const fromEmbed = segments[embedIndex + 1];
        return /^[a-zA-Z0-9_-]{11}$/.test(fromEmbed) ? fromEmbed : null;
      }
    }
  } catch {
    return null;
  }

  return null;
}

function normalizeStatus(value: unknown): ContextStatus {
  const normalized = (readString(value) ?? "").toLowerCase();
  if (normalized === "supported") return "supported";
  if (normalized === "conflicting") return "conflicting";
  return "not_found";
}

function normalizeVideo(row: unknown): PublishedVideo | null {
  if (!isRecord(row)) return null;
  if (!isPublishedRecord(row)) return null;

  const id =
    readString(row.video_id) ??
    readString(row.videoId) ??
    readString(row.id) ??
    readString(row.slug) ??
    null;
  const title = readString(row.title) ?? readString(row.name) ?? null;
  const youtubeId =
    extractYoutubeId(readString(row.youtube_id) ?? "") ??
    extractYoutubeId(readString(row.youtubeId) ?? "") ??
    extractYoutubeId(readString(row.external_video_id) ?? "") ??
    extractYoutubeId(readString(row.externalVideoId) ?? "") ??
    extractYoutubeId(id);
  const directUrl =
    readString(row.video_url) ??
    readString(row.videoUrl) ??
    readString(row.stream_url) ??
    readString(row.streamUrl) ??
    readString(row.url) ??
    readString(row.src) ??
    null;
  const videoUrl = directUrl ?? (youtubeId ? `https://www.youtube.com/watch?v=${youtubeId}` : null);

  if (!id || !title || !videoUrl) return null;

  return {
    id,
    title,
    videoUrl,
    youtubeId: youtubeId ?? extractYoutubeId(videoUrl),
    thumbnailUrl:
      readString(row.thumbnail) ??
      readString(row.thumbnail_url) ??
      readString(row.thumbnailUrl) ??
      readString(row.poster) ??
      null,
    publishedAt:
      readString(row.published_at) ??
      readString(row.publishedAt) ??
      readString(row.created_at) ??
      readString(row.createdAt) ??
      null,
    durationSeconds:
      readNumber(row.duration_seconds) ??
      readNumber(row.durationSeconds) ??
      readNumber(row.duration_s) ??
      null,
  };
}

function normalizeClaim(row: unknown, idx: number): ContextClaim | null {
  if (!isRecord(row)) return null;
  if (!isPublishedRecord(row)) return null;

  const timestamp = readString(row.timestamp) ?? readString(row.time) ?? null;
  const claimText = readString(row.claim_text) ?? readString(row.claimText) ?? null;
  const contextText = readString(row.context_text) ?? readString(row.contextText) ?? null;
  if (!timestamp || !claimText || !contextText) return null;

  const sourcesRaw = Array.isArray(row.sources) ? row.sources : [];
  const sources: ContextSource[] = sourcesRaw
    .map((sourceRow) => {
      if (!isRecord(sourceRow)) return null;
      const url = readString(sourceRow.url);
      const title = readString(sourceRow.title) ?? "Zdroj";
      const sourceType = readString(sourceRow.source_type) ?? readString(sourceRow.sourceType) ?? "source";
      if (!url) return null;
      return { url, title, sourceType };
    })
    .filter((source): source is ContextSource => Boolean(source));

  return {
    id: `${timestamp}-${idx}-${claimText.slice(0, 24)}`,
    timestamp,
    timeSeconds: parseTimestampToSeconds(timestamp),
    claimText,
    contextText,
    status: normalizeStatus(row.status),
    sourceQualitySummary:
      readString(row.source_quality_summary) ?? readString(row.sourceQualitySummary) ?? null,
    sources,
  };
}

export async function fetchPublishedVideos(): Promise<PublishedVideo[]> {
  if (videosCache.data) return videosCache.data;
  if (videosCache.promise) return videosCache.promise;

  videosCache.promise = fetch(`${API_BASE}/videos`, {
    cache: "force-cache",
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`GET /videos failed with ${response.status}`);
      }
      const payload = (await response.json()) as unknown;
      const normalized = asList(payload)
        .map((row) => normalizeVideo(row))
        .filter((row): row is PublishedVideo => Boolean(row));
      videosCache.data = normalized;
      return normalized;
    })
    .finally(() => {
      videosCache.promise = null;
    });

  return videosCache.promise;
}

export async function fetchPublishedContext(videoId: string): Promise<ContextClaim[]> {
  if (contextCache.has(videoId)) {
    return contextCache.get(videoId) ?? [];
  }
  if (contextPromiseCache.has(videoId)) {
    return contextPromiseCache.get(videoId) ?? Promise.resolve([]);
  }

  const promise = fetch(`${API_BASE}/context/${encodeURIComponent(videoId)}`, {
    cache: "force-cache",
  })
    .then(async (response) => {
      if (response.status === 404) {
        contextCache.set(videoId, []);
        return [];
      }
      if (!response.ok) {
        throw new Error(`GET /context/${videoId} failed with ${response.status}`);
      }
      const payload = (await response.json()) as unknown;
      const claims = asList(payload)
        .map((row, idx) => normalizeClaim(row, idx))
        .filter((row): row is ContextClaim => Boolean(row))
        .sort((a, b) => a.timeSeconds - b.timeSeconds);
      contextCache.set(videoId, claims);
      return claims;
    })
    .finally(() => {
      contextPromiseCache.delete(videoId);
    });

  contextPromiseCache.set(videoId, promise);
  return promise;
}
