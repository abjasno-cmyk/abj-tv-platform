import { NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";

import { createSupabaseAnonServerClient } from "@/lib/supabase/server";

// Nejnovější epizody podcastu podle zdroje v `sources` (platform='podcast',
// channel_url = oficiální RSS feed). Feed URL bereme VÝHRADNĚ z DB — žádné
// URL od klienta, tím pádem žádné SSRF. RSS odpověď se cachuje přes fetch.
export const dynamic = "force-dynamic";

const EPISODE_LIMIT = 12;
const FEED_TIMEOUT_MS = 8000;
const FEED_REVALIDATE_S = 1800;
/** Jak dlouho smíme servírovat poslední úspěšný feed, když upstream vypadne. */
const STALE_FALLBACK_MS = 6 * 60 * 60 * 1000;

type PodcastEpisode = {
  id: string;
  title: string;
  publishedAt: string | null;
  durationSec: number | null;
  image: string | null;
  audioUrl: string;
};

function readText(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number") return String(value);
  // fast-xml-parser vrací {"#text": ...} u tagů s atributy a {"#cdata": ...} u CDATA
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if ("#cdata" in obj) return readText(obj["#cdata"]);
    if ("#text" in obj) return readText(obj["#text"]);
  }
  return null;
}

function parseDurationSec(raw: string | null): number | null {
  if (!raw) return null;
  if (/^\d+$/.test(raw)) return Number(raw);
  const parts = raw.split(":").map(Number);
  if (parts.some((n) => !Number.isFinite(n))) return null;
  return parts.reduce((acc, n) => acc * 60 + n, 0);
}

function parsePubDate(raw: string | null): string | null {
  if (!raw) return null;
  const ts = Date.parse(raw);
  return Number.isFinite(ts) ? new Date(ts).toISOString() : null;
}

function itemImage(item: Record<string, unknown>): string | null {
  const itunes = item["itunes:image"] as Record<string, unknown> | undefined;
  return readText(itunes?.["@_href"]) ?? null;
}

type PodcastPayload = {
  channelName: string;
  image: string | null;
  episodes: PodcastEpisode[];
};

// Poslední úspěšná odpověď per kanál. Cizí RSS (ČRo, Seznam, Transistor)
// občas vypadne — bez tohohle by divák dostal 502 místo epizod. Žije jen
// v paměti instance, což pro zmírnění krátkých výpadků stačí.
// ponytail: in-memory Map, sdílená cache až kdyby výpadky byly delší
const lastGoodByChannel = new Map<string, { at: number; payload: PodcastPayload }>();

export async function GET(request: Request) {
  const url = new URL(request.url);
  const channelName = (url.searchParams.get("channel") ?? "").trim();
  if (!channelName || channelName.length > 120) {
    return NextResponse.json({ episodes: [], error: "Chybí parametr channel." }, { status: 400 });
  }

  const supabase = createSupabaseAnonServerClient();
  const { data, error } = await supabase
    .from("sources")
    .select("source_name, channel_url")
    .eq("platform", "podcast")
    .eq("active", true)
    .eq("source_name", channelName)
    .limit(1)
    .maybeSingle();
  if (error || !data?.channel_url || !/^https:\/\//.test(data.channel_url)) {
    return NextResponse.json({ episodes: [], error: "Neznámý podcastový zdroj." }, { status: 404 });
  }

  try {
    const response = await fetch(data.channel_url, {
      headers: { Accept: "application/rss+xml, application/xml, text/xml", "User-Agent": "Mozilla/5.0 (compatible; abj-tv)" },
      next: { revalidate: FEED_REVALIDATE_S },
      signal: AbortSignal.timeout(FEED_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`feed HTTP ${response.status}`);
    const xml = await response.text();

    const parser = new XMLParser({ ignoreAttributes: false, cdataPropName: "#cdata" });
    const parsed = parser.parse(xml) as Record<string, any>;
    const channel = parsed?.rss?.channel;
    if (!channel) throw new Error("feed bez <channel>");

    const showImage =
      readText(channel["itunes:image"]?.["@_href"]) ?? readText(channel.image?.url) ?? null;

    const rawItems: Array<Record<string, unknown>> = Array.isArray(channel.item)
      ? channel.item
      : channel.item
        ? [channel.item]
        : [];

    const episodes: PodcastEpisode[] = [];
    for (const item of rawItems) {
      const enclosure = item.enclosure as Record<string, unknown> | undefined;
      const audioUrl = readText(enclosure?.["@_url"]);
      const type = readText(enclosure?.["@_type"]) ?? "";
      if (!audioUrl || !/^https:\/\//.test(audioUrl) || (type && !type.startsWith("audio/"))) continue;
      const title =
        readText((item.title as Record<string, unknown>)?.["#cdata"] ?? item.title) ?? null;
      if (!title) continue;
      episodes.push({
        id: readText((item.guid as Record<string, unknown>)?.["#text"] ?? item.guid) ?? audioUrl,
        title,
        publishedAt: parsePubDate(readText(item.pubDate)),
        durationSec: parseDurationSec(readText(item["itunes:duration"])),
        image: itemImage(item) ?? showImage,
        audioUrl,
      });
      if (episodes.length >= EPISODE_LIMIT) break;
    }

    const payload: PodcastPayload = {
      channelName: data.source_name,
      image: showImage,
      episodes,
    };
    if (episodes.length > 0) {
      lastGoodByChannel.set(channelName, { at: Date.now(), payload });
    }
    return NextResponse.json(payload);
  } catch (error) {
    console.error("podcast-latest-feed-failed", channelName, error);
    const cached = lastGoodByChannel.get(channelName);
    if (cached && Date.now() - cached.at < STALE_FALLBACK_MS) {
      return NextResponse.json({ ...cached.payload, stale: true });
    }
    return NextResponse.json(
      { episodes: [], error: "Podcastový feed se nepodařilo načíst." },
      { status: 502 },
    );
  }
}
