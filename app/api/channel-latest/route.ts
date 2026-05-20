type ChannelLatestVideo = {
  videoId: string;
  title: string;
  publishedAt: string;
  thumbnail: string;
};

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
  const channelId = searchParams.get("channelId")?.trim() ?? "";
  const requestedLimit = Number.parseInt(searchParams.get("limit") ?? "4", 10);
  const limit = Number.isFinite(requestedLimit) ? Math.min(8, Math.max(1, requestedLimit)) : 4;

  if (!channelId) {
    return Response.json({ videos: [], error: "Missing channelId." }, { status: 400 });
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
