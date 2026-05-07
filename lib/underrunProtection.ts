export type GapFillType = "panorama" | "weather" | "short" | "boundary";

type WeatherPayload = {
  city?: string;
  temp_c?: number;
  wind_kmh?: number;
  wind_kph?: number;
};

type PanoramaPayload = {
  embed_url?: string;
  city?: string;
};

export type GapFillItem = {
  type: GapFillType;
  duration_sec: number;
  video_id?: string;
  title?: string;
  purpose?: string;
  extra?: {
    weather?: WeatherPayload;
    panorama?: PanoramaPayload;
  };
};

export type GapFillPlan = {
  schema_version: string;
  fillers: GapFillItem[];
  total_filled_sec?: number;
};

export type SafetyBridgePayload = {
  schema_version: string;
  block: GapFillItem;
};

function normalizeEnvValue(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function readFeedApiKeyFromClientEnv(): string | null {
  return (
    normalizeEnvValue(process.env.NEXT_PUBLIC_FEED_API_KEY) ??
    normalizeEnvValue(process.env.NEXT_PUBLIC_PROGRAM_FEED_API_KEY) ??
    null
  );
}

function buildHeaders(apiKey: string | null): HeadersInit {
  if (!apiKey) return {};
  return { "x-api-key": apiKey };
}

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`program-endpoint-${response.status}`);
  }
  return (await response.json()) as T;
}

export async function fetchGapFillPlan(params: {
  seconds: number;
  currentBlockId: string;
  nextBlockId: string;
  apiKey: string | null;
}): Promise<GapFillPlan> {
  const query = new URLSearchParams({
    seconds: String(Math.max(0, Math.floor(params.seconds))),
    current_block_id: params.currentBlockId,
    next_block_id: params.nextBlockId,
  });
  const response = await fetch(`/api/replit/program/fill-gap?${query.toString()}`, {
    headers: buildHeaders(params.apiKey),
    cache: "no-store",
  });
  return parseJson<GapFillPlan>(response);
}

export async function fetchSafetyBridge(apiKey: string | null): Promise<SafetyBridgePayload> {
  const response = await fetch("/api/replit/program/safety-bridge", {
    headers: buildHeaders(apiKey),
    cache: "no-store",
  });
  return parseJson<SafetyBridgePayload>(response);
}
