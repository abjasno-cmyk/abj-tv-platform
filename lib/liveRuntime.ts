"use client";

export type RecommendedVideo = {
  id: string;
  title: string;
  durationSec: number;
  thumbnail: string;
  videoUrl: string;
  reason: string;
  tags: string[];
  publishedAt: string;
};

export type LiveRuntimeBlock = {
  channel: string;
  title: string;
  videoId: string;
  startedAt: string;
  endsAt: string;
  durationSec: number;
  tags: string[];
};

export type LiveRuntimeResponse = {
  block: LiveRuntimeBlock | null;
  recommended?: RecommendedVideo[];
  [key: string]: unknown;
};

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function normalizeRecommended(input: unknown): RecommendedVideo | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const row = input as Record<string, unknown>;
  const id = asString(row.id);
  const title = asString(row.title);
  const videoUrl = asString(row.videoUrl);
  if (!id || !title || !videoUrl) return null;
  return {
    id,
    title,
    durationSec: Math.max(0, Math.floor(asNumber(row.durationSec))),
    thumbnail: asString(row.thumbnail),
    videoUrl,
    reason: asString(row.reason),
    tags: asStringArray(row.tags),
    publishedAt: asString(row.publishedAt),
  };
}

function normalizeBlock(input: unknown): LiveRuntimeBlock | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const row = input as Record<string, unknown>;
  const videoId = asString(row.videoId);
  if (!videoId) return null;
  return {
    channel: asString(row.channel),
    title: asString(row.title),
    videoId,
    startedAt: asString(row.startedAt),
    endsAt: asString(row.endsAt),
    durationSec: Math.max(0, Math.floor(asNumber(row.durationSec))),
    tags: asStringArray(row.tags),
  };
}

function normalizeRuntimePayload(input: unknown): LiveRuntimeResponse {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { block: null };
  }
  const payload = input as Record<string, unknown>;
  const recommendedRaw = Array.isArray(payload.recommended) ? payload.recommended : undefined;
  const recommended = recommendedRaw
    ?.map((row) => normalizeRecommended(row))
    .filter((row): row is RecommendedVideo => row !== null);
  return {
    ...payload,
    block: normalizeBlock(payload.block),
    recommended,
  };
}

export async function fetchLiveRuntime(options?: { signal?: AbortSignal }): Promise<LiveRuntimeResponse> {
  const response = await fetch("/api/live/runtime", {
    method: "GET",
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
    signal: options?.signal,
  });
  if (!response.ok) {
    throw new Error(`live-runtime-fetch-failed-${response.status}`);
  }
  const json = (await response.json()) as unknown;
  return normalizeRuntimePayload(json);
}
