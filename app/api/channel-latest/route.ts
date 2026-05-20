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

const CHANNEL_ID_REGEXES = [
  /"channelId":"(UC[0-9A-Za-z_-]{20,})"/,
  /<meta itemprop="channelId" content="(UC[0-9A-Za-z_-]{20,})"/,
  /https:\/\/www\.youtube\.com\/channel\/(UC[0-9A-Za-z_-]{20,})/,
];

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

  const uniqueCandidates = [...new Set(candidates)];
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  let channelId = searchParams.get("channelId")?.trim() ?? "";
  const channelUrl = searchParams.get("channelUrl")?.trim() ?? "";
  const requestedLimit = Number.parseInt(searchParams.get("limit") ?? "4", 10);
  const limit = Number.isFinite(requestedLimit) ? Math.min(8, Math.max(1, requestedLimit)) : 4;

  if (!channelId && channelUrl) {
    const parsed = parseChannelUrl(channelUrl);
    if (parsed.directChannelId) {
      channelId = parsed.directChannelId;
    } else {
      const apiKey = resolveYouTubeApiKey();
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

  if (!channelId) {
    return Response.json(
      { videos: [], error: "Chybí channelId a nepodařilo se ho odvodit z URL kanálu." },
      { status: 400 }
    );
  }

  try {
    const feedUrl = new URL("https://www.youtube.com/feeds/videos.xml");
    feedUrl.searchParams.set("channel_id", channelId);
    const response = await fetchWithTimeout(feedUrl.toString(), 10000);
    if (!response.ok) {
      return Response.json(
        {
          videos: [],
          error: `YouTube feed unavailable (${response.status}).`,
        },
        { status: 502 }
      );
    }

    const xml = await response.text();
    const videos = parseLatestVideosFromXml(xml, limit);
    return Response.json({ videos });
  } catch (error) {
    return Response.json(
      {
        videos: [],
        error: error instanceof Error ? error.message : "Unknown channel fetch error",
      },
      { status: 500 }
    );
  }
}
