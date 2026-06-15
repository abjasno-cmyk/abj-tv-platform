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

export async function fetchVideoTranscriptServer(
  videoId: string,
  request = new Request(`https://verox.cz/api/transcript/${encodeURIComponent(videoId)}`),
): Promise<TranscriptResponse | null> {
  const normalized = videoId.trim();
  if (!normalized) return null;

  const { baseUrl, apiKey } = resolveTranscriptProviderConfig();
  const providerUrl = new URL(`${baseUrl}/${encodeURIComponent(normalized)}`);
  const incoming = new URL(request.url);
  incoming.searchParams.forEach((value, key) => {
    providerUrl.searchParams.append(key, value);
  });

  let response: Response;
  try {
    response = await fetch(providerUrl.toString(), {
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

  if (response.status === 401 || response.status === 403) {
    throw new TranscriptProviderError(
      "provider_auth_failed",
      "Transcript provider authorization failed.",
      response.status,
    );
  }
  if (response.status === 404) {
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

  return payload;
}
