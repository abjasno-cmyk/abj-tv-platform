type ChannelLatestVideo = {
  videoId: string;
  title: string;
  publishedAt: string;
  thumbnail: string;
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

async function resolveLatestVideosBySearchQuery(channelName: string, apiKey: string | null, limit: number): Promise<ChannelLatestVideo[]> {
  if (!apiKey) return [];
  const normalized = channelName.trim();
  if (!normalized) return [];
  try {
    const url = new URL("https://www.googleapis.com/youtube/v3/search");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("type", "video");
    url.searchParams.set("order", "date");
    url.searchParams.set("maxResults", String(Math.min(10, Math.max(1, limit))));
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
      .filter((video): video is ChannelLatestVideo => Boolean(video))
      .slice(0, limit);
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  let channelId = searchParams.get("channelId")?.trim() ?? "";
  const channelUrl = searchParams.get("channelUrl")?.trim() ?? "";
  const channelName = searchParams.get("channelName")?.trim() ?? "";
  const requestedLimit = Number.parseInt(searchParams.get("limit") ?? "4", 10);
  const limit = Number.isFinite(requestedLimit) ? Math.min(8, Math.max(1, requestedLimit)) : 4;
  const apiKey = resolveYouTubeApiKey();

  if (channelId && !isValidYouTubeChannelId(channelId)) {
    channelId = "";
  }

  if (!channelId && channelUrl) {
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
    let feedResult = await fetchChannelFeed(channelId, limit);

    // Some stored source IDs are stale or not YouTube channel IDs.
    // If feed lookup fails, resolve channel ID again from URL/name and retry once.
    if (!feedResult.ok && (feedResult.status === 404 || feedResult.status === 400)) {
      let retriedChannelId = "";
      if (channelUrl) {
        const parsed = parseChannelUrl(channelUrl);
        if (
          parsed.directChannelId &&
          isValidYouTubeChannelId(parsed.directChannelId) &&
          parsed.directChannelId !== channelId
        ) {
          retriedChannelId = parsed.directChannelId;
        } else {
          if (apiKey && parsed.handle) {
            retriedChannelId = (await resolveChannelIdByHandle(parsed.handle, apiKey)) ?? "";
          }
          if (!retriedChannelId && apiKey && parsed.username) {
            retriedChannelId = (await resolveChannelIdByUsername(parsed.username, apiKey)) ?? "";
          }
          if (!retriedChannelId) {
            retriedChannelId = (await resolveChannelIdFromPage(parsed)) ?? "";
          }
        }
      }
      if (!retriedChannelId && channelName) {
        retriedChannelId = (await resolveChannelIdBySearchQuery(channelName, apiKey)) ?? "";
      }
      if (retriedChannelId && retriedChannelId !== channelId) {
        const retriedResult = await fetchChannelFeed(retriedChannelId, limit);
        if (retriedResult.ok) {
          channelId = retriedChannelId;
          feedResult = retriedResult;
        }
      }
    }

    if (!feedResult.ok) {
      const fallbackVideos = await resolveLatestVideosBySearchQuery(channelName, apiKey, limit);
      if (fallbackVideos.length > 0) {
        return Response.json({ videos: fallbackVideos, resolvedChannelId: null, fallback: "search" });
      }
      return Response.json(
        {
          videos: [],
          error: `YouTube feed unavailable (${feedResult.status}).`,
        },
        { status: 502 }
      );
    }

    return Response.json({ videos: feedResult.videos, resolvedChannelId: channelId });
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
