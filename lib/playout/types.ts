// Typy odpovědí NONSTOP PLAYOUT enginu (Replit). Viz klientská specifikace:
// /program/now, /program/fill-gap, /program/safety-bridge.

export type PlayoutFillerType = "panorama" | "weather" | "short" | "boundary" | string;

export interface PlayoutPanorama {
  embed_url: string;
  city?: string;
}

export interface PlayoutFillerExtra {
  panorama?: PlayoutPanorama;
  weather?: unknown;
  [key: string]: unknown;
}

// Filler i safety-bridge "block" sdílí stejný tvar přehratelné jednotky.
export interface PlayoutFiller {
  type: PlayoutFillerType;
  duration_sec: number;
  video_id?: string;
  title?: string;
  extra?: PlayoutFillerExtra;
  purpose?: string;
}

export interface PlayoutMediaSource {
  kind?: string;
  url?: string;
  video_id?: string;
  [key: string]: unknown;
}

// Pevný programový blok ("co hrát teď").
export interface PlayoutBlock {
  block_id: string;
  starts_at: string;
  ends_at: string;
  // Kdy reálně dojede video (starts_at + video_duration_sec, oříznuto na ends_at).
  // Podle TOHOTO pole přepínáme. Když je null, řídíme se ends_at + YouTube ENDED.
  expected_ends_at?: string | null;
  video_duration_sec?: number | null;
  video_id: string;
  type?: string;
  media_sources?: PlayoutMediaSource[];
}

export interface ProgramNowResponse {
  server_time: string;
  block: PlayoutBlock | null;
  offset_sec: number;
  next_block: PlayoutBlock | null;
  next_starts_in_sec: number;
}

export interface FillGapResponse {
  schema_version: string;
  strategy: string;
  fillers: PlayoutFiller[];
  total_filled_sec: number;
}

export interface SafetyBridgeResponse {
  schema_version: string;
  block: PlayoutFiller;
}

// Řazený alternativní zdroj přehrávání (multi-source: YT → Rumble → external embed).
export interface PlayoutSourceCandidate {
  videoId?: string;
  url?: string;
}

// Co právě "drží obraz" — řídí, co render stage zobrazí.
export type PlayoutSurface =
  | {
      kind: "youtube";
      videoId: string;
      startSeconds: number;
      title?: string;
      // Fallbacky z media_sources — Stage je zkusí po řadě, když YouTube embed selže.
      fallbacks?: PlayoutSourceCandidate[];
    }
  | { kind: "embed"; url: string; label?: string }
  | { kind: "ident"; title: string }
  | { kind: "weather"; data: unknown; label?: string };

// media_sources má neznámý přesný tvar (chybí Multi-source doc) — čteme defenzivně
// běžná pole: video_id / videoId, url / embed_url.
export function mapMediaSourcesToFallbacks(
  sources: PlayoutMediaSource[] | undefined,
  primaryVideoId: string,
): PlayoutSourceCandidate[] {
  if (!Array.isArray(sources)) return [];
  const out: PlayoutSourceCandidate[] = [];
  for (const source of sources) {
    if (!source || typeof source !== "object") continue;
    const videoId =
      typeof source.video_id === "string"
        ? source.video_id.trim()
        : typeof (source as Record<string, unknown>).videoId === "string"
          ? String((source as Record<string, unknown>).videoId).trim()
          : "";
    const url =
      typeof source.url === "string"
        ? source.url.trim()
        : typeof (source as Record<string, unknown>).embed_url === "string"
          ? String((source as Record<string, unknown>).embed_url).trim()
          : "";
    if (videoId && videoId === primaryVideoId) continue; // primární už hrajeme
    if (videoId) out.push({ videoId });
    else if (url) out.push({ url });
  }
  return out;
}
