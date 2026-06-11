export type ResolvedYoutubeChannelIds = {
  channelId: string;
  uploadsPlaylistId: string;
};

type YoutubeChannelsResponse = {
  items?: Array<{
    id?: string;
    contentDetails?: {
      relatedPlaylists?: {
        uploads?: string;
      };
    };
  }>;
};

const CHANNEL_ID_HTML_REGEXES = [
  /"channelId":"(UC[0-9A-Za-z_-]{20,})"/,
  /<meta itemprop="channelId" content="(UC[0-9A-Za-z_-]{20,})"/,
  /https:\/\/www\.youtube\.com\/channel\/(UC[0-9A-Za-z_-]{20,})/,
];

export function extractHandleFromChannelUrl(channelUrl: string): string | null {
  const normalizedUrl = channelUrl.trim();
  if (!normalizedUrl) return null;

  try {
    const parsed = new URL(normalizedUrl);
    const [firstSegment] = parsed.pathname.split("/").filter(Boolean);
    if (!firstSegment?.startsWith("@")) return null;
    return firstSegment;
  } catch {
    return null;
  }
}

export function uploadsPlaylistIdFromChannelId(channelId: string): string | null {
  const normalized = channelId.trim();
  if (!normalized.startsWith("UC")) return null;
  return `UU${normalized.slice(2)}`;
}

function parseChannelIdFromHtml(html: string): string | null {
  for (const regex of CHANNEL_ID_HTML_REGEXES) {
    const match = html.match(regex);
    const channelId = match?.[1]?.trim();
    if (channelId) return channelId;
  }
  return null;
}

export async function scrapeChannelIdFromChannelUrl(channelUrl: string): Promise<string | null> {
  const normalizedUrl = channelUrl.trim();
  if (!normalizedUrl) return null;

  try {
    const response = await fetch(normalizedUrl, {
      cache: "no-store",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari",
      },
    });
    if (!response.ok) return null;
    const html = await response.text();
    return parseChannelIdFromHtml(html);
  } catch {
    return null;
  }
}

export async function resolveChannelIdsByHandle(
  apiKey: string,
  handle: string
): Promise<ResolvedYoutubeChannelIds | null> {
  const normalized = handle.trim().replace(/^@+/, "");
  if (!normalized) return null;

  const candidates = [normalized, `@${normalized}`];
  for (const candidate of candidates) {
    try {
      const url = new URL("https://www.googleapis.com/youtube/v3/channels");
      url.searchParams.set("part", "id,contentDetails");
      url.searchParams.set("forHandle", candidate);
      url.searchParams.set("maxResults", "1");
      url.searchParams.set("key", apiKey);

      const response = await fetch(url.toString());
      if (!response.ok) continue;

      const payload = (await response.json()) as YoutubeChannelsResponse;
      const channelId = payload.items?.[0]?.id?.trim();
      const uploadsPlaylistId = payload.items?.[0]?.contentDetails?.relatedPlaylists?.uploads?.trim();
      if (!channelId || !uploadsPlaylistId) continue;
      return { channelId, uploadsPlaylistId };
    } catch {
      // Try next candidate.
    }
  }

  return null;
}

export async function resolveChannelIdsByChannelId(
  apiKey: string,
  channelId: string
): Promise<ResolvedYoutubeChannelIds | null> {
  const normalized = channelId.trim();
  if (!normalized) return null;

  try {
    const url = new URL("https://www.googleapis.com/youtube/v3/channels");
    url.searchParams.set("part", "id,contentDetails");
    url.searchParams.set("id", normalized);
    url.searchParams.set("maxResults", "1");
    url.searchParams.set("key", apiKey);

    const response = await fetch(url.toString());
    if (!response.ok) return null;

    const payload = (await response.json()) as YoutubeChannelsResponse;
    const resolvedChannelId = payload.items?.[0]?.id?.trim();
    const uploadsPlaylistId = payload.items?.[0]?.contentDetails?.relatedPlaylists?.uploads?.trim();
    if (!resolvedChannelId || !uploadsPlaylistId) return null;
    return { channelId: resolvedChannelId, uploadsPlaylistId };
  } catch {
    return null;
  }
}

export async function resolveChannelIdsFromChannelUrl(
  channelUrl: string,
  apiKey: string
): Promise<ResolvedYoutubeChannelIds | null> {
  const normalizedUrl = channelUrl.trim();
  if (!normalizedUrl) return null;

  try {
    const parsed = new URL(normalizedUrl);
    const parts = parsed.pathname.split("/").filter(Boolean);
    const first = parts[0];

    if (first === "channel" && parts[1]) {
      const fromApi = await resolveChannelIdsByChannelId(apiKey, parts[1]);
      if (fromApi) return fromApi;
      const uploadsPlaylistId = uploadsPlaylistIdFromChannelId(parts[1]);
      return uploadsPlaylistId ? { channelId: parts[1], uploadsPlaylistId } : null;
    }

    const handle = extractHandleFromChannelUrl(normalizedUrl);
    if (handle) {
      const fromHandle = await resolveChannelIdsByHandle(apiKey, handle);
      if (fromHandle) return fromHandle;
    }

    const scrapedChannelId = await scrapeChannelIdFromChannelUrl(normalizedUrl);
    if (scrapedChannelId) {
      const fromApi = await resolveChannelIdsByChannelId(apiKey, scrapedChannelId);
      if (fromApi) return fromApi;
      const uploadsPlaylistId = uploadsPlaylistIdFromChannelId(scrapedChannelId);
      return uploadsPlaylistId ? { channelId: scrapedChannelId, uploadsPlaylistId } : null;
    }
  } catch {
    return null;
  }

  return null;
}
