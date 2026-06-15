import "server-only";

import { parseTranscriptResponse, type TranscriptResponse } from "@/lib/transcriptTypes";

type TranscriptProviderErrorCode =
  | "provider_config_missing"
  | "provider_auth_failed"
  | "provider_upstream_error"
  | "provider_invalid_response";

export class TranscriptProviderError extends Error {
  readonly code: TranscriptProviderErrorCode;
  readonly providerStatus?: number;

  constructor(code: TranscriptProviderErrorCode, message: string, providerStatus?: number) {
    super(message);
    this.name = "TranscriptProviderError";
    this.code = code;
    this.providerStatus = providerStatus;
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

function resolveTranscriptProviderConfig(): { baseUrl: string; apiKey: string } {
  const baseUrl = sanitizeEnvValue(process.env.VEROX_TRANSCRIPTS_BASE_URL);
  const apiKey = sanitizeEnvValue(process.env.VEROX_TRANSCRIPTS_API_KEY);
  if (!baseUrl || !apiKey) {
    throw new TranscriptProviderError(
      "provider_config_missing",
      "Transcript provider configuration is missing.",
    );
  }
  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey };
}

function unavailableEnvelope(videoId: string): TranscriptResponse {
  return {
    video_id: videoId,
    status: "unavailable",
    transcript: null,
    transcript_at: null,
    transcript_original: null,
    source_lang: null,
  };
}

function processingEnvelope(videoId: string): TranscriptResponse {
  return {
    video_id: videoId,
    status: "processing",
    transcript: null,
    transcript_at: null,
    transcript_original: null,
    source_lang: null,
  };
}

type ProviderTranscriptStatus = TranscriptResponse["status"] | "unknown";

function mapProviderPayload(payload: unknown): TranscriptResponse | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const row = payload as Record<string, unknown>;
  const normalized = {
    video_id: row.video_id,
    status:
      row.status === "queued" || row.status === "pending" ? "processing" : row.status,
    transcript: row.transcript,
    transcript_at: row.transcript_at,
    transcript_original: row.transcript_original ?? row.transcript_orig ?? null,
    source_lang: row.source_lang,
  };
  return parseTranscriptResponse(normalized);
}

async function fetchProviderTranscript(
  baseUrl: string,
  apiKey: string,
  videoId: string,
  request: Request,
): Promise<Response> {
  const providerUrl = new URL(`${baseUrl}/${encodeURIComponent(videoId)}`);
  const incoming = new URL(request.url);
  incoming.searchParams.forEach((value, key) => {
    providerUrl.searchParams.append(key, value);
  });

  try {
    return await fetch(providerUrl.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-Api-Key": apiKey,
      },
      cache: "no-store",
      next: { revalidate: 0 },
    });
  } catch {
    throw new TranscriptProviderError(
      "provider_upstream_error",
      "Transcript provider request failed.",
    );
  }
}

function normalizeProviderStatus(value: unknown): ProviderTranscriptStatus | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "queued" || normalized === "pending" || normalized === "processing") return "processing";
  if (normalized === "ready") return "ready";
  if (normalized === "not_ready_live") return "not_ready_live";
  if (normalized === "unavailable") return "unavailable";
  if (normalized === "unknown") return "unknown";
  return null;
}

function extractStatusFromStatusPayload(payload: unknown, videoId: string): ProviderTranscriptStatus | null {
  if (!payload || typeof payload !== "object") return null;
  if (Array.isArray(payload)) {
    for (const row of payload) {
      if (!row || typeof row !== "object" || Array.isArray(row)) continue;
      const entry = row as Record<string, unknown>;
      const candidateId =
        typeof entry.video_id === "string"
          ? entry.video_id.trim()
          : typeof entry.videoId === "string"
            ? entry.videoId.trim()
            : typeof entry.id === "string"
              ? entry.id.trim()
              : "";
      if (candidateId && candidateId !== videoId) continue;
      const status = normalizeProviderStatus(entry.status);
      if (status) return status;
    }
    return null;
  }

  const root = payload as Record<string, unknown>;
  const nestedCandidates = [root.videos, root.items, root.results, root.data];
  for (const nested of nestedCandidates) {
    const status = extractStatusFromStatusPayload(nested, videoId);
    if (status) return status;
  }

  const directByVideoId = root[videoId];
  if (directByVideoId && typeof directByVideoId === "object" && !Array.isArray(directByVideoId)) {
    const status = normalizeProviderStatus((directByVideoId as Record<string, unknown>).status);
    if (status) return status;
  }

  return normalizeProviderStatus(root.status);
}

async function fetchProviderStatus(baseUrl: string, apiKey: string, videoId: string): Promise<ProviderTranscriptStatus | null> {
  const statusUrl = new URL(`${baseUrl}/status`);
  statusUrl.searchParams.set("video_ids", videoId);

  let response: Response;
  try {
    response = await fetch(statusUrl.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-Api-Key": apiKey,
      },
      cache: "no-store",
      next: { revalidate: 0 },
    });
  } catch {
    return null;
  }

  if (response.status === 401 || response.status === 403) {
    throw new TranscriptProviderError(
      "provider_auth_failed",
      "Transcript provider authorization failed.",
      response.status,
    );
  }
  if (!response.ok) return null;

  let payload: unknown;
  try {
    payload = (await response.json()) as unknown;
  } catch {
    return null;
  }

  return extractStatusFromStatusPayload(payload, videoId);
}

export async function fetchVideoTranscriptServer(
  videoId: string,
  request = new Request(`https://verox.cz/api/transcript/${encodeURIComponent(videoId)}`),
): Promise<TranscriptResponse | null> {
  const normalized = videoId.trim();
  if (!normalized) return null;

  const { baseUrl, apiKey } = resolveTranscriptProviderConfig();
  const response = await fetchProviderTranscript(baseUrl, apiKey, normalized, request);

  if (response.status === 401 || response.status === 403) {
    throw new TranscriptProviderError(
      "provider_auth_failed",
      "Transcript provider authorization failed.",
      response.status,
    );
  }
  if (response.status === 404) {
    const statusFromProvider = await fetchProviderStatus(baseUrl, apiKey, normalized);
    if (statusFromProvider === "processing" || statusFromProvider === "unknown") {
      return processingEnvelope(normalized);
    }
    if (statusFromProvider === "not_ready_live") {
      return { ...processingEnvelope(normalized), status: "not_ready_live" };
    }
    return unavailableEnvelope(normalized);
  }
  if (!response.ok) {
    throw new TranscriptProviderError(
      "provider_upstream_error",
      "Transcript provider returned non-success response.",
      response.status,
    );
  }

  let payloadRaw: unknown;
  try {
    payloadRaw = (await response.json()) as unknown;
  } catch {
    throw new TranscriptProviderError(
      "provider_invalid_response",
      "Transcript provider returned invalid JSON.",
    );
  }

  const payload = mapProviderPayload(payloadRaw);
  if (!payload) {
    throw new TranscriptProviderError(
      "provider_invalid_response",
      "Transcript provider payload does not match transcript contract.",
    );
  }

  if (payload.status === "unavailable") {
    const statusFromProvider = await fetchProviderStatus(baseUrl, apiKey, normalized);
    if (statusFromProvider === "processing" || statusFromProvider === "unknown") {
      return processingEnvelope(normalized);
    }
    if (statusFromProvider === "not_ready_live") {
      return { ...processingEnvelope(normalized), status: "not_ready_live" };
    }
  }

  return payload;
}
