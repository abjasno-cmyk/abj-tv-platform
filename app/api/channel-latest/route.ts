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

function parseChannelUrl(channelUrl: string): {
  directChannelId: string | null;
  handle: string | null;
  username: string | null;
} {
  try {
    const parsed = new URL(channelUrl);
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts.length === 0) return { directChannelId: null, handle: null, username: null };

    const first = parts[0];
    if (first === "channel" && parts[1]) {
      return { directChannelId: parts[1], handle: null, username: null };
    }
    if (first.startsWith("@")) {
      return { directChannelId: null, handle: first.slice(1), username: null };
    }
    if ((first === "user" || first === "c") && parts[1]) {
      return { directChannelId: null, handle: null, username: parts[1] };
    }
  } catch {
    // Ignore malformed URL.
  }
  return { directChannelId: null, handle: null, username: null };
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
      const response = await fetch(url.toString(), { cache: "no-store" });
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
    const response = await fetch(url.toString(), { cache: "no-store" });
    if (!response.ok) return null;
    const payload = (await response.json()) as YouTubeChannelLookupPayload;
    return payload.items?.[0]?.id?.trim() ?? null;
  } catch {
    return null;
  }
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
    const response = await fetch(feedUrl.toString(), { cache: "no-store" });
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
