import {
  LIVE_CHANNEL_VIDEO_DISPLAY_LIMIT,
  LIVE_CHANNEL_VIDEO_FETCH_BUFFER,
  selectLatestNonShortChannelVideos,
  type ChannelVideoCandidate,
} from "@/lib/liveChannelVideos";
import { parseIsoDurationSeconds } from "@/lib/youtubeShort";

type ChannelLatestVideo = {
  videoId: string;
  title: string;
  publishedAt: string;
  thumbnail: string;
  durationIso?: string | null;
  durationMin?: number | null;
};

type YouTubeChannelLookupPayload = {
  items?: Array<{
    id?: string;
  }>;
};

type YouTubeSearchPayload = {
  items?: Array<{
    id?: {
      channelId?: string;
    };
  }>;
};

type YouTubeVideoSearchPayload = {
  items?: Array<{
    id?: {
      videoId?: string;
    };
    snippet?: {
      title?: string;
      publishedAt?: string;
      thumbnails?: {
        high?: { url?: string };
        medium?: { url?: string };
        default?: { url?: string };
      };
    };
  }>;
};

type YouTubeVideosListPayload = {
  items?: Array<{
    id?: string;
    contentDetails?: {
      duration?: string;
    };
  }>;
};

type YouTubeChannelContentPayload = {
  items?: Array<{
    contentDetails?: {
      relatedPlaylists?: {
        uploads?: string;
      };
    };
  }>;
};

type YouTubePlaylistItemsPayload = {
  items?: Array<{
    snippet?: {
      title?: string;
      publishedAt?: string;
      resourceId?: {
        videoId?: string;
      };
      thumbnails?: {
        high?: { url?: string };
        medium?: { url?: string };
        default?: { url?: string };
      };
    };
  }>;
};

const CHANNEL_ID_REGEXES = [
  /"channelId":"(UC[0-9A-Za-z_-]{20,})"/,
  /<meta itemprop="channelId" content="(UC[0-9A-Za-z_-]{20,})"/,
  /https:\/\/www\.youtube\.com\/channel\/(UC[0-9A-Za-z_-]{20,})/,
];

function isValidYouTubeChannelId(value: string): boolean {
  return /^UC[0-9A-Za-z_-]{20,}$/.test(value.trim());
}

// SSRF guard: server-side fetch smí cílit jen na YouTube/Google hosty. Uživatel
// posílá channelUrl, takže bez allowlistu by šlo donutit server stahovat interní
// adresy (cloud metadata, localhost, interní služby).
const ALLOWED_FETCH_HOSTS = new Set([
  "www.youtube.com",
  "youtube.com",
  "m.youtube.com",
  "www.googleapis.com",
]);

function isAllowedUpstreamUrl(rawUrl: string): boolean {
  try {
    const { protocol, hostname } = new URL(rawUrl);
    return protocol === "https:" && ALLOWED_FETCH_HOSTS.has(hostname.toLowerCase());
  } catch {
    return false;
  }
}

function sanitizeEnvValue(value?: string): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  const equalsIdx = trimmed.indexOf("=");
  const maybeAssigned =
    equalsIdx > 0 && /^[A-Z0-9_]+$/.test(trimmed.slice(0, equalsIdx))
      ? trimmed.slice(equalsIdx + 1).trim()
      : trimmed;
  if (
    (maybeAssigned.startsWith('"') && maybeAssigned.endsWith('"')) ||
    (maybeAssigned.startsWith("'") && maybeAssigned.endsWith("'"))
  ) {
    return maybeAssigned.slice(1, -1).trim();
  }
  return maybeAssigned;
}

function resolveYouTubeApiKey(): string | null {
  return sanitizeEnvValue(process.env.YOUTUBE_API_KEY) ?? null;
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari",
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

function normalizeChannelUrlInput(channelUrl: string): string {
  const trimmed = channelUrl.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("@")) {
    return `https://www.youtube.com/${trimmed}`;
  }
  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  if (/^(www\.)?(m\.)?youtube\.com\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

function parseChannelUrl(channelUrl: string): {
  directChannelId: string | null;
  handle: string | null;
  username: string | null;
  normalizedUrl: string | null;
} {
  const normalizedInput = normalizeChannelUrlInput(channelUrl);
  try {
    const parsed = new URL(normalizedInput);
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts.length === 0) return { directChannelId: null, handle: null, username: null, normalizedUrl: parsed.toString() };

    const first = parts[0];
    if (first === "channel" && parts[1]) {
      return { directChannelId: parts[1], handle: null, username: null, normalizedUrl: parsed.toString() };
    }
    if (first.startsWith("@")) {
      return { directChannelId: null, handle: first.slice(1), username: null, normalizedUrl: parsed.toString() };
    }
    if ((first === "user" || first === "c") && parts[1]) {
      return { directChannelId: null, handle: null, username: parts[1], normalizedUrl: parsed.toString() };
    }
  } catch {
    // Ignore malformed URL.
  }
  return { directChannelId: null, handle: null, username: null, normalizedUrl: null };
}

async function resolveChannelIdByHandle(handle: string, apiKey: string): Promise<string | null> {
  const normalized = handle.trim().replace(/^@+/, "");
  if (!normalized) return null;
  const candidates = [normalized, `@${normalized}`];
  for (const candidate of candidates) {
    try {
      const url = new URL("https://www.googleapis.com/youtube/v3/channels");
      url.searchParams.set("part", "id");
      url.searchParams.set("forHandle", candidate);
      url.searchParams.set("maxResults", "1");
      url.searchParams.set("key", apiKey);
      const response = await fetchWithTimeout(url.toString(), 9000);
      if (!response.ok) continue;
      const payload = (await response.json()) as YouTubeChannelLookupPayload;
      const resolved = payload.items?.[0]?.id?.trim();
      if (resolved) return resolved;
    } catch {
      // Continue to next attempt.
    }
  }
  return null;
}

async function resolveChannelIdByUsername(username: string, apiKey: string): Promise<string | null> {
  const normalized = username.trim();
  if (!normalized) return null;
  try {
    const url = new URL("https://www.googleapis.com/youtube/v3/channels");
    url.searchParams.set("part", "id");
    url.searchParams.set("forUsername", normalized);
    url.searchParams.set("maxResults", "1");
    url.searchParams.set("key", apiKey);
    const response = await fetchWithTimeout(url.toString(), 9000);
    if (!response.ok) return null;
    const payload = (await response.json()) as YouTubeChannelLookupPayload;
    return payload.items?.[0]?.id?.trim() ?? null;
  } catch {
    return null;
  }
}

async function resolveChannelIdBySearchQuery(channelName: string, apiKey: string | null): Promise<string | null> {
  const normalized = channelName.trim();
  if (!normalized) return null;

  if (apiKey) {
    try {
      const url = new URL("https://www.googleapis.com/youtube/v3/search");
      url.searchParams.set("part", "snippet");
      url.searchParams.set("type", "channel");
      url.searchParams.set("maxResults", "1");
      url.searchParams.set("q", normalized);
      url.searchParams.set("key", apiKey);
      const response = await fetchWithTimeout(url.toString(), 9000);
      if (response.ok) {
        const payload = (await response.json()) as YouTubeSearchPayload;
        const resolved = payload.items?.[0]?.id?.channelId?.trim();
        if (resolved) return resolved;
      }
    } catch {
      // Continue to HTML fallback.
    }
  }

  try {
    const searchUrl = new URL("https://www.youtube.com/results");
    searchUrl.searchParams.set("search_query", normalized);
    const response = await fetchWithTimeout(searchUrl.toString(), 9000);
    if (!response.ok) return null;
    const html = await response.text();
    return parseChannelIdFromHtml(html);
  } catch {
    return null;
  }
}

async function resolveLatestVideosBySearchQuery(
  channelName: string,
  apiKey: string | null,
  fetchLimit: number,
): Promise<ChannelLatestVideo[]> {
  if (!apiKey) return [];
  const normalized = channelName.trim();
  if (!normalized) return [];
  try {
    const url = new URL("https://www.googleapis.com/youtube/v3/search");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("type", "video");
    url.searchParams.set("order", "date");
    url.searchParams.set("maxResults", String(Math.min(50, Math.max(1, fetchLimit))));
    url.searchParams.set("q", normalized);
    url.searchParams.set("key", apiKey);
    const response = await fetchWithTimeout(url.toString(), 9000);
    if (!response.ok) return [];
    const payload = (await response.json()) as YouTubeVideoSearchPayload;
    return (payload.items ?? [])
      .map((item): ChannelLatestVideo | null => {
        const videoId = item.id?.videoId?.trim();
        const title = item.snippet?.title?.trim();
        if (!videoId || !title) return null;
        const thumbnail =
          item.snippet?.thumbnails?.high?.url?.trim() ||
          item.snippet?.thumbnails?.medium?.url?.trim() ||
          item.snippet?.thumbnails?.default?.url?.trim() ||
          `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`;
        return {
          videoId,
          title,
          publishedAt: item.snippet?.publishedAt?.trim() || new Date(0).toISOString(),
          thumbnail,
        };
      })
      .filter((video): video is ChannelLatestVideo => Boolean(video));
  } catch {
    return [];
  }
}

function parseChannelIdFromHtml(html: string): string | null {
  for (const regex of CHANNEL_ID_REGEXES) {
    const match = html.match(regex);
    const channelId = match?.[1]?.trim();
    if (channelId) return channelId;
  }
  return null;
}

async function resolveChannelIdFromPage(parsed: {
  handle: string | null;
  username: string | null;
  normalizedUrl: string | null;
}): Promise<string | null> {
  const candidates: string[] = [];
  if (parsed.normalizedUrl) candidates.push(parsed.normalizedUrl);
  if (parsed.handle) candidates.push(`https://www.youtube.com/@${parsed.handle}`);
  if (parsed.username) {
    candidates.push(`https://www.youtube.com/user/${parsed.username}`);
    candidates.push(`https://www.youtube.com/c/${parsed.username}`);
  }

  // Jen povolené hosty — channelUrl je od uživatele (ochrana proti SSRF).
  const uniqueCandidates = [...new Set(candidates)].filter(isAllowedUpstreamUrl);
  for (const candidate of uniqueCandidates) {
    try {
      const response = await fetchWithTimeout(candidate, 9000);
      if (!response.ok) continue;
      const html = await response.text();
      const channelId = parseChannelIdFromHtml(html);
      if (channelId) return channelId;
    } catch {
      // Try next candidate.
    }
  }
  return null;
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function parseTagValue(source: string, regex: RegExp): string | null {
  const match = source.match(regex);
  if (!match || typeof match[1] !== "string") return null;
  const trimmed = match[1].trim();
  return trimmed.length > 0 ? decodeXmlEntities(trimmed) : null;
}

function parseLatestVideosFromXml(xml: string, limit: number): ChannelLatestVideo[] {
  const entries = xml.match(/<entry>([\s\S]*?)<\/entry>/g) ?? [];
  const videos: ChannelLatestVideo[] = [];
  for (const entry of entries) {
    const videoId = parseTagValue(entry, /<yt:videoId>([^<]+)<\/yt:videoId>/);
    const title = parseTagValue(entry, /<title>([\s\S]*?)<\/title>/);
    const publishedAt =
      parseTagValue(entry, /<published>([^<]+)<\/published>/) ??
      parseTagValue(entry, /<updated>([^<]+)<\/updated>/) ??
      new Date(0).toISOString();

    if (!videoId || !title) continue;
    videos.push({
      videoId,
      title,
      publishedAt,
      thumbnail: `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`,
    });
    if (videos.length >= limit) break;
  }
  return videos;
}

function toPublicChannelVideo(video: ChannelVideoCandidate): ChannelLatestVideo {
  return {
    videoId: video.videoId,
    title: video.title,
    publishedAt: video.publishedAt,
    thumbnail: video.thumbnail ?? `https://i.ytimg.com/vi/${encodeURIComponent(video.videoId)}/hqdefault.jpg`,
  };
}

async function enrichVideosWithDuration(
  videos: ChannelLatestVideo[],
  apiKey: string,
): Promise<ChannelLatestVideo[]> {
  if (videos.length === 0) return videos;
  const durationByVideoId = new Map<string, string>();
  const ids = videos.map((video) => video.videoId).filter(Boolean);

  for (let idx = 0; idx < ids.length; idx += 50) {
    const batch = ids.slice(idx, idx + 50);
    try {
      const url = new URL("https://www.googleapis.com/youtube/v3/videos");
      url.searchParams.set("part", "contentDetails");
      url.searchParams.set("id", batch.join(","));
      url.searchParams.set("key", apiKey);
      const response = await fetchWithTimeout(url.toString(), 9000);
      if (!response.ok) continue;
      const payload = (await response.json()) as YouTubeVideosListPayload;
      for (const item of payload.items ?? []) {
        const videoId = item.id?.trim();
        const duration = item.contentDetails?.duration?.trim();
        if (videoId && duration) durationByVideoId.set(videoId, duration);
      }
    } catch {
      // Continue without duration for this batch.
    }
  }

  return videos.map((video) => {
    const durationIso = durationByVideoId.get(video.videoId) ?? null;
    const durationSeconds = parseIsoDurationSeconds(durationIso);
    return {
      ...video,
      durationIso,
      durationMin: durationSeconds !== null ? durationSeconds / 60 : null,
    };
  });
}

async function resolveUploadsPlaylistId(channelId: string, apiKey: string): Promise<string | null> {
  try {
    const url = new URL("https://www.googleapis.com/youtube/v3/channels");
    url.searchParams.set("part", "contentDetails");
    url.searchParams.set("id", channelId);
    url.searchParams.set("key", apiKey);
    const response = await fetchWithTimeout(url.toString(), 9000);
    if (!response.ok) return null;
    const payload = (await response.json()) as YouTubeChannelContentPayload;
    return payload.items?.[0]?.contentDetails?.relatedPlaylists?.uploads?.trim() ?? null;
  } catch {
    return null;
  }
}

async function fetchUploadPlaylistVideos(
  channelId: string,
  apiKey: string,
  fetchLimit: number,
): Promise<ChannelLatestVideo[]> {
  const uploadsPlaylistId = await resolveUploadsPlaylistId(channelId, apiKey);
  if (!uploadsPlaylistId) return [];

  try {
    const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("playlistId", uploadsPlaylistId);
    url.searchParams.set("maxResults", String(Math.min(50, Math.max(1, fetchLimit))));
    url.searchParams.set("key", apiKey);
    const response = await fetchWithTimeout(url.toString(), 9000);
    if (!response.ok) return [];
    const payload = (await response.json()) as YouTubePlaylistItemsPayload;
    return (payload.items ?? [])
      .map((item): ChannelLatestVideo | null => {
        const videoId = item.snippet?.resourceId?.videoId?.trim();
        const title = item.snippet?.title?.trim();
        if (!videoId || !title) return null;
        const thumbnail =
          item.snippet?.thumbnails?.high?.url?.trim() ||
          item.snippet?.thumbnails?.medium?.url?.trim() ||
          item.snippet?.thumbnails?.default?.url?.trim() ||
          `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`;
        return {
          videoId,
          title,
          publishedAt: item.snippet?.publishedAt?.trim() || new Date(0).toISOString(),
          thumbnail,
        };
      })
      .filter((video): video is ChannelLatestVideo => Boolean(video));
  } catch {
    return [];
  }
}

async function finalizeChannelVideos(
  videos: ChannelLatestVideo[],
  displayLimit: number,
  fetchBuffer: number,
  apiKey: string | null,
): Promise<ChannelLatestVideo[]> {
  const candidates = videos.slice(0, fetchBuffer);
  const enriched =
    apiKey && candidates.length > 0 ? await enrichVideosWithDuration(candidates, apiKey) : candidates;
  const selected = selectLatestNonShortChannelVideos(
    enriched.map(
      (video): ChannelVideoCandidate => ({
        videoId: video.videoId,
        title: video.title,
        thumbnail: video.thumbnail,
        publishedAt: video.publishedAt,
        durationMin: video.durationMin ?? null,
        durationIso: video.durationIso ?? null,
      }),
    ),
    displayLimit,
  );
  return selected.map(toPublicChannelVideo);
}

async function fetchChannelFeed(channelId: string, limit: number): Promise<{ ok: boolean; status: number; videos: ChannelLatestVideo[] }> {
  const feedUrl = new URL("https://www.youtube.com/feeds/videos.xml");
  feedUrl.searchParams.set("channel_id", channelId);
  const response = await fetchWithTimeout(feedUrl.toString(), 10000);
  if (!response.ok) {
    return { ok: false, status: response.status, videos: [] };
  }
  const xml = await response.text();
  return { ok: true, status: response.status, videos: parseLatestVideosFromXml(xml, limit) };
}

async function resolveAlternateChannelId(input: {
  channelUrl: string;
  channelName: string;
  apiKey: string | null;
  excludeChannelId?: string;
}): Promise<string> {
  const exclude = input.excludeChannelId?.trim() ?? "";
  let retriedChannelId = "";

  if (input.channelUrl) {
    const parsed = parseChannelUrl(input.channelUrl);
    if (
      parsed.directChannelId &&
      isValidYouTubeChannelId(parsed.directChannelId) &&
      parsed.directChannelId !== exclude
    ) {
      retriedChannelId = parsed.directChannelId;
    } else {
      if (input.apiKey && parsed.handle) {
        retriedChannelId = (await resolveChannelIdByHandle(parsed.handle, input.apiKey)) ?? "";
      }
      if (!retriedChannelId && input.apiKey && parsed.username) {
        retriedChannelId = (await resolveChannelIdByUsername(parsed.username, input.apiKey)) ?? "";
      }
      if (!retriedChannelId) {
        retriedChannelId = (await resolveChannelIdFromPage(parsed)) ?? "";
      }
    }
  }

  if ((!retriedChannelId || retriedChannelId === exclude) && input.channelName) {
    const fromSearch = (await resolveChannelIdBySearchQuery(input.channelName, input.apiKey)) ?? "";
    if (fromSearch && fromSearch !== exclude) {
      retriedChannelId = fromSearch;
    }
  }

  return retriedChannelId && retriedChannelId !== exclude ? retriedChannelId : "";
}

async function loadRawChannelVideos(
  channelId: string,
  apiKey: string | null,
  fetchBuffer: number,
): Promise<{ rawVideos: ChannelLatestVideo[]; feedResult: { ok: boolean; status: number; videos: ChannelLatestVideo[] } }> {
  let rawVideos: ChannelLatestVideo[] = [];

  if (apiKey) {
    rawVideos = await fetchUploadPlaylistVideos(channelId, apiKey, fetchBuffer);
  }

  const feedResult = rawVideos.length > 0
    ? { ok: true, status: 200, videos: rawVideos }
    : await fetchChannelFeed(channelId, fetchBuffer);

  if (rawVideos.length === 0 && feedResult.ok) {
    rawVideos = feedResult.videos;
  }

  return { rawVideos, feedResult };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requestedChannelId = searchParams.get("channelId")?.trim() ?? "";
  const channelUrl = searchParams.get("channelUrl")?.trim() ?? "";
  const channelName = searchParams.get("channelName")?.trim() ?? "";
  const requestedLimit = Number.parseInt(searchParams.get("limit") ?? String(LIVE_CHANNEL_VIDEO_DISPLAY_LIMIT), 10);
  const displayLimit = Number.isFinite(requestedLimit)
    ? Math.min(LIVE_CHANNEL_VIDEO_DISPLAY_LIMIT, Math.max(1, requestedLimit))
    : LIVE_CHANNEL_VIDEO_DISPLAY_LIMIT;
  const fetchBuffer = Math.max(displayLimit * 3, LIVE_CHANNEL_VIDEO_FETCH_BUFFER);
  const apiKey = resolveYouTubeApiKey();

  let channelId = "";
  const staleChannelId =
    requestedChannelId && isValidYouTubeChannelId(requestedChannelId) ? requestedChannelId : "";

  // channelUrl je spolehlivější než zastaralé channel_id z DB.
  if (channelUrl) {
    const parsed = parseChannelUrl(channelUrl);
    if (parsed.directChannelId && isValidYouTubeChannelId(parsed.directChannelId)) {
      channelId = parsed.directChannelId;
    } else {
      if (apiKey && parsed.handle) {
        channelId = (await resolveChannelIdByHandle(parsed.handle, apiKey)) ?? "";
      }
      if (!channelId && apiKey && parsed.username) {
        channelId = (await resolveChannelIdByUsername(parsed.username, apiKey)) ?? "";
      }
      if (!channelId) {
        channelId = (await resolveChannelIdFromPage(parsed)) ?? "";
      }
    }
  } else if (staleChannelId) {
    channelId = staleChannelId;
  }

  if (!channelId && channelName) {
    channelId = (await resolveChannelIdBySearchQuery(channelName, apiKey)) ?? "";
  }

  if (!channelId) {
    return Response.json(
      { videos: [], error: "Chybí channelId a nepodařilo se ho odvodit z URL ani názvu kanálu." },
      { status: 400 }
    );
  }

  try {
    let { rawVideos, feedResult } = await loadRawChannelVideos(channelId, apiKey, fetchBuffer);

    // Stale/missing IDs (Bazalová, Deník TO, …): znovu odvodit z URL/názvu a zkusit fetch.
    if (rawVideos.length === 0 && (channelUrl || channelName)) {
      const retriedChannelId = await resolveAlternateChannelId({
        channelUrl,
        channelName,
        apiKey,
        excludeChannelId: channelId || staleChannelId,
      });
      if (retriedChannelId) {
        channelId = retriedChannelId;
        ({ rawVideos, feedResult } = await loadRawChannelVideos(channelId, apiKey, fetchBuffer));
      }
    }

    if (rawVideos.length === 0) {
      const fallbackVideos = await resolveLatestVideosBySearchQuery(channelName, apiKey, fetchBuffer);
      if (fallbackVideos.length > 0) {
        const videos = await finalizeChannelVideos(fallbackVideos, displayLimit, fetchBuffer, apiKey);
        return Response.json({ videos, resolvedChannelId: channelId || null, fallback: "search" });
      }

      if (!feedResult.ok) {
        return Response.json(
          {
            videos: [],
            error: `YouTube feed unavailable (${feedResult.status}).`,
          },
          { status: 502 },
        );
      }
    }

    let videos = await finalizeChannelVideos(rawVideos, displayLimit, fetchBuffer, apiKey);
    if (videos.length === 0 && rawVideos.length > 0 && (channelUrl || channelName)) {
      const retriedChannelId = await resolveAlternateChannelId({
        channelUrl,
        channelName,
        apiKey,
        excludeChannelId: channelId || staleChannelId,
      });
      if (retriedChannelId) {
        channelId = retriedChannelId;
        ({ rawVideos, feedResult } = await loadRawChannelVideos(channelId, apiKey, fetchBuffer));
        videos = await finalizeChannelVideos(rawVideos, displayLimit, fetchBuffer, apiKey);
      }
    }

    return Response.json({ videos, resolvedChannelId: channelId });
  } catch (error) {
    // Detail jen do server logu; klientovi generická hláška (chybové hlášky
    // fetch() mohou prozradit interní hostname/port).
    console.error("channel-latest-fetch-error", error);
    return Response.json(
      { videos: [], error: "Videa kanálu se teď nepodařilo načíst." },
      { status: 500 }
    );
  }
}
