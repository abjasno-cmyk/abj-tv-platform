import "server-only";

import crypto from "node:crypto";
import { unstable_cache } from "next/cache";

import type { ProgramManualScheduleItem } from "@/lib/epg-types";

const PROGRAM_FEED_SCHEMA_VERSION = "program-feed.v1";
const PRAGUE_TIMEZONE = "Europe/Prague";
const IMPORT_REVALIDATE_SECONDS = 300;
export const PROGRAM_FEED_CACHE_TAG = "program-feed-import";

type FeedFreshness = "fresh" | "stale-allowed" | "expired" | "unknown";
type FeedStatus = "ok" | "warning" | "error" | "disabled";

type FeedBlock = {
  block_id: string;
  starts_at: string;
  ends_at: string;
  title: string;
  video_id: string | null;
  channel: string;
  source_type: string;
  priority: number;
  is_pinned: boolean;
  is_locked: boolean;
  feed_version: string;
};

type FeedPayload = {
  schema_version: string;
  revision: string;
  generated_at: string;
  valid_until: string;
  stale_after: string;
  timezone: string;
  blocks: FeedBlock[];
};

export type ProgramFeedImportReport = {
  enabled: boolean;
  status: FeedStatus;
  feedUrl: string | null;
  fetchedAt: string;
  schemaVersion: string | null;
  revision: string | null;
  freshness: FeedFreshness;
  validUntil: string | null;
  staleAfter: string | null;
  signatureVerified: boolean | null;
  importedItems: number;
  skippedBlocks: number;
  warnings: string[];
  errors: string[];
};

export type ProgramFeedImportResult = {
  manualSchedule: ProgramManualScheduleItem[];
  report: ProgramFeedImportReport;
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

function parseIsoDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function toParts(date: Date, options: Intl.DateTimeFormatOptions): Record<string, string> {
  return new Intl.DateTimeFormat("cs-CZ", {
    timeZone: PRAGUE_TIMEZONE,
    ...options,
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, part) => {
      if (part.type !== "literal") acc[part.type] = part.value;
      return acc;
    }, {});
}

function toPragueDateKey(date: Date): string {
  const p = toParts(date, { year: "numeric", month: "2-digit", day: "2-digit" });
  return `${p.year}-${p.month}-${p.day}`;
}

function toPragueTime(date: Date): string {
  const p = toParts(date, { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${p.hour}:${p.minute}`;
}

function resolveFeedUrl(): string | null {
  const value = sanitizeEnvValue(process.env.PROGRAM_FEED_URL);
  if (!value) return null;
  return value;
}

function resolveSignatureSecret(): string | null {
  return (
    sanitizeEnvValue(process.env.PROGRAM_FEED_HMAC_SECRET) ??
    sanitizeEnvValue(process.env.SESSION_SECRET) ??
    null
  );
}

function resolveFeedApiKey(): string | null {
  return (
    sanitizeEnvValue(process.env.FEED_API_KEY) ??
    sanitizeEnvValue(process.env.PROGRAM_FEED_API_KEY) ??
    null
  );
}

function allowStaleFeedWindow(): boolean {
  const value = sanitizeEnvValue(process.env.PROGRAM_FEED_STALE_ALLOWED);
  if (!value) return false;
  const normalized = value.toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function determineFreshness(validUntil: Date | null, staleAfter: Date | null, now: Date): FeedFreshness {
  if (!validUntil || !staleAfter) return "unknown";
  if (now.getTime() <= validUntil.getTime()) return "fresh";
  if (now.getTime() <= staleAfter.getTime()) return "stale-allowed";
  return "expired";
}

function verifySignature(header: string | null, body: string, secret: string): boolean {
  if (!header?.startsWith("v1=")) return false;
  const received = header.slice(3).trim();
  if (!received || !/^[a-f0-9]+$/i.test(received)) return false;

  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  const receivedBuffer = Buffer.from(received.toLowerCase(), "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  if (receivedBuffer.length !== expectedBuffer.length) return false;
  return crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
}

function emptyResult(feedUrl: string | null, message: string): ProgramFeedImportResult {
  return {
    manualSchedule: [],
    report: {
      enabled: false,
      status: "disabled",
      feedUrl,
      fetchedAt: new Date().toISOString(),
      schemaVersion: null,
      revision: null,
      freshness: "unknown",
      validUntil: null,
      staleAfter: null,
      signatureVerified: null,
      importedItems: 0,
      skippedBlocks: 0,
      warnings: [message],
      errors: [],
    },
  };
}

function coerceFeedBlock(raw: unknown, index: number, errors: string[]): FeedBlock | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    errors.push(`blocks[${index}] is not an object`);
    return null;
  }
  const value = raw as Record<string, unknown>;
  const blockId = typeof value.block_id === "string" ? value.block_id : "";
  const startsAt = typeof value.starts_at === "string" ? value.starts_at : "";
  const endsAt = typeof value.ends_at === "string" ? value.ends_at : "";
  const title = typeof value.title === "string" ? value.title : "";
  const channel = typeof value.channel === "string" ? value.channel : "ABJ TV";
  const sourceType = typeof value.source_type === "string" ? value.source_type : "";
  const feedVersion = typeof value.feed_version === "string" ? value.feed_version : "";
  const priority = typeof value.priority === "number" ? value.priority : NaN;
  const isPinned = typeof value.is_pinned === "boolean" ? value.is_pinned : null;
  const isLocked = typeof value.is_locked === "boolean" ? value.is_locked : null;
  const videoId =
    value.video_id === null
      ? null
      : typeof value.video_id === "string" && value.video_id.trim()
        ? value.video_id.trim()
        : "";

  if (!blockId) errors.push(`blocks[${index}] block_id is missing`);
  if (!parseIsoDate(startsAt)) errors.push(`blocks[${index}] starts_at is invalid`);
  if (!parseIsoDate(endsAt)) errors.push(`blocks[${index}] ends_at is invalid`);
  if (!title.trim()) errors.push(`blocks[${index}] title is missing`);
  if (!Number.isInteger(priority)) errors.push(`blocks[${index}] priority must be integer`);
  if (isPinned === null) errors.push(`blocks[${index}] is_pinned must be boolean`);
  if (isLocked === null) errors.push(`blocks[${index}] is_locked must be boolean`);
  if (!sourceType) errors.push(`blocks[${index}] source_type is missing`);
  if (!feedVersion) errors.push(`blocks[${index}] feed_version is missing`);
  if (videoId === "") errors.push(`blocks[${index}] video_id must be string or null`);

  if (
    !blockId ||
    !startsAt ||
    !endsAt ||
    !title.trim() ||
    !Number.isInteger(priority) ||
    isPinned === null ||
    isLocked === null ||
    !sourceType ||
    !feedVersion ||
    videoId === ""
  ) {
    return null;
  }

  return {
    block_id: blockId,
    starts_at: startsAt,
    ends_at: endsAt,
    title: title.trim(),
    video_id: videoId,
    channel: channel.trim() || "ABJ TV",
    source_type: sourceType,
    priority,
    is_pinned: isPinned,
    is_locked: isLocked,
    feed_version: feedVersion,
  };
}

function toManualSchedule(blocks: FeedBlock[], errors: string[]): {
  items: ProgramManualScheduleItem[];
  skippedBlocks: number;
} {
  const items: ProgramManualScheduleItem[] = [];
  let skippedBlocks = 0;
  const seenBlockIds = new Set<string>();

  for (const block of blocks) {
    if (seenBlockIds.has(block.block_id)) {
      errors.push(`Duplicate block_id: ${block.block_id}`);
      continue;
    }
    seenBlockIds.add(block.block_id);

    const start = parseIsoDate(block.starts_at);
    const end = parseIsoDate(block.ends_at);
    if (!start || !end || end.getTime() <= start.getTime()) {
      errors.push(`Invalid time window in block ${block.block_id}`);
      continue;
    }

    if (!block.video_id) {
      skippedBlocks += 1;
      continue;
    }

    const durationMin = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60_000));
    const effectivePriority =
      block.priority + (block.is_pinned ? 1_000 : 0) + (block.is_locked ? 10_000 : 0);
    const isABJ =
      block.channel.toLowerCase().includes("abj") || block.source_type.toLowerCase().includes("abj");

    items.push({
      videoId: block.video_id,
      date: toPragueDateKey(start),
      time: toPragueTime(start),
      durationMin,
      priority: effectivePriority,
      title: block.title,
      channel: block.channel,
      isABJ,
    });
  }

  return { items, skippedBlocks };
}

async function fetchAndValidateProgramFeed(feedUrl: string): Promise<ProgramFeedImportResult> {
  const warnings: string[] = [];
  const errors: string[] = [];
  const fetchedAt = new Date().toISOString();

  let responseText = "";
  let signatureVerified: boolean | null = null;
  const feedApiKey = resolveFeedApiKey();

  try {
    const response = await fetch(feedUrl, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "User-Agent": "abj-program-importer/1.0",
        ...(feedApiKey ? { "X-Api-Key": feedApiKey } : {}),
      },
    });
    responseText = await response.text();

    if (!response.ok) {
      return {
        manualSchedule: [],
        report: {
          enabled: true,
          status: "error",
          feedUrl,
          fetchedAt,
          schemaVersion: null,
          revision: null,
          freshness: "unknown",
          validUntil: null,
          staleAfter: null,
          signatureVerified: null,
          importedItems: 0,
          skippedBlocks: 0,
          warnings,
          errors: [`Feed HTTP error: ${response.status}`],
        },
      };
    }

    const secret = resolveSignatureSecret();
    const signatureHeader = response.headers.get("x-signature");
    if (secret) {
      signatureVerified = verifySignature(signatureHeader, responseText, secret);
      if (!signatureVerified) {
        errors.push("x-signature verification failed");
      }
    } else if (signatureHeader?.startsWith("v1=")) {
      warnings.push("Signature header present, but local secret missing (verification skipped)");
      signatureVerified = null;
    } else {
      warnings.push("Signature verification skipped (secret missing)");
      signatureVerified = null;
    }

    let payloadUnknown: unknown = null;
    try {
      payloadUnknown = JSON.parse(responseText);
    } catch {
      errors.push("Feed body is not valid JSON");
    }

    if (!payloadUnknown || typeof payloadUnknown !== "object" || Array.isArray(payloadUnknown)) {
      errors.push("Feed payload root must be an object");
    }

    const payload = (payloadUnknown ?? {}) as Partial<FeedPayload>;
    const schemaVersion = typeof payload.schema_version === "string" ? payload.schema_version : null;
    const revision = typeof payload.revision === "string" ? payload.revision : null;
    const generatedAt = parseIsoDate(payload.generated_at);
    const validUntil = parseIsoDate(payload.valid_until);
    const staleAfter = parseIsoDate(payload.stale_after);
    const timezone = typeof payload.timezone === "string" ? payload.timezone : null;

    if (schemaVersion !== PROGRAM_FEED_SCHEMA_VERSION) {
      errors.push(`Unsupported schema_version: ${schemaVersion ?? "missing"}`);
    }
    if (!revision) errors.push("revision is missing");
    if (!generatedAt) errors.push("generated_at is invalid");
    if (!validUntil) errors.push("valid_until is invalid");
    if (!staleAfter) errors.push("stale_after is invalid");
    if (timezone !== PRAGUE_TIMEZONE) {
      errors.push(`timezone must be ${PRAGUE_TIMEZONE}`);
    }

    if (generatedAt && validUntil && validUntil.getTime() <= generatedAt.getTime()) {
      errors.push("valid_until must be greater than generated_at");
    }
    if (validUntil && staleAfter && staleAfter.getTime() < validUntil.getTime()) {
      errors.push("stale_after must be greater than or equal to valid_until");
    }

    const freshness = determineFreshness(validUntil, staleAfter, new Date());
    if (freshness === "expired") {
      errors.push("Feed is expired (stale_after already passed)");
    } else if (freshness === "stale-allowed") {
      warnings.push("Feed is stale-allowed (valid_until already passed)");
      if (!allowStaleFeedWindow()) {
        errors.push("stale-allowed feed rejected (PROGRAM_FEED_STALE_ALLOWED not enabled)");
      }
    }

    const rawBlocks = Array.isArray(payload.blocks) ? payload.blocks : null;
    if (!rawBlocks) {
      errors.push("blocks must be an array");
    }

    const blocks: FeedBlock[] = [];
    if (rawBlocks) {
      rawBlocks.forEach((raw, index) => {
        const block = coerceFeedBlock(raw, index, errors);
        if (block) blocks.push(block);
      });
    }

    if (errors.length > 0) {
      return {
        manualSchedule: [],
        report: {
          enabled: true,
          status: "error",
          feedUrl,
          fetchedAt,
          schemaVersion,
          revision,
          freshness,
          validUntil: validUntil?.toISOString() ?? null,
          staleAfter: staleAfter?.toISOString() ?? null,
          signatureVerified,
          importedItems: 0,
          skippedBlocks: 0,
          warnings,
          errors,
        },
      };
    }

    const { items, skippedBlocks } = toManualSchedule(blocks, errors);
    if (errors.length > 0) {
      return {
        manualSchedule: [],
        report: {
          enabled: true,
          status: "error",
          feedUrl,
          fetchedAt,
          schemaVersion,
          revision,
          freshness,
          validUntil: validUntil?.toISOString() ?? null,
          staleAfter: staleAfter?.toISOString() ?? null,
          signatureVerified,
          importedItems: 0,
          skippedBlocks,
          warnings,
          errors,
        },
      };
    }

    return {
      manualSchedule: items,
      report: {
        enabled: true,
        status: warnings.length > 0 ? "warning" : "ok",
        feedUrl,
        fetchedAt,
        schemaVersion,
        revision,
        freshness,
        validUntil: validUntil?.toISOString() ?? null,
        staleAfter: staleAfter?.toISOString() ?? null,
        signatureVerified,
        importedItems: items.length,
        skippedBlocks,
        warnings,
        errors: [],
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown feed import error";
    return {
      manualSchedule: [],
      report: {
        enabled: true,
        status: "error",
        feedUrl,
        fetchedAt,
        schemaVersion: null,
        revision: null,
        freshness: "unknown",
        validUntil: null,
        staleAfter: null,
        signatureVerified,
        importedItems: 0,
        skippedBlocks: 0,
        warnings,
        errors: [message],
      },
    };
  }
}

function getCachedProgramFeedImport(feedUrl: string): () => Promise<ProgramFeedImportResult> {
  return unstable_cache(
    async () => fetchAndValidateProgramFeed(feedUrl),
    ["program-feed-import-v1", feedUrl],
    {
      revalidate: IMPORT_REVALIDATE_SECONDS,
      tags: [PROGRAM_FEED_CACHE_TAG],
    }
  );
}

export async function getProgramFeedImport(): Promise<ProgramFeedImportResult> {
  const feedUrl = resolveFeedUrl();
  if (!feedUrl) {
    return emptyResult(feedUrl, "PROGRAM_FEED_URL is not configured");
  }
  const cachedImport = getCachedProgramFeedImport(feedUrl);
  return cachedImport();
}

export async function refreshProgramFeedImport(): Promise<ProgramFeedImportResult> {
  const feedUrl = resolveFeedUrl();
  if (!feedUrl) {
    return emptyResult(feedUrl, "PROGRAM_FEED_URL is not configured");
  }
  return fetchAndValidateProgramFeed(feedUrl);
}

export async function getProgramFeedImportHealth(): Promise<ProgramFeedImportReport> {
  const result = await getProgramFeedImport();
  return result.report;
}

export async function importProgramFeedIntoOverrides(): Promise<{
  manualSchedule: ProgramManualScheduleItem[];
}> {
  const imported = await getProgramFeedImport();
  if (imported.report.status === "error" || imported.report.freshness === "expired") {
    return { manualSchedule: [] };
  }
  if (imported.report.freshness === "stale-allowed" && !allowStaleFeedWindow()) {
    return { manualSchedule: [] };
  }
  return { manualSchedule: imported.manualSchedule };
}
