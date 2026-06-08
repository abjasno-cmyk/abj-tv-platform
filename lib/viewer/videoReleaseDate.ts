export type VideoReleaseDateSource = {
  publishedAt?: string | null;
  scheduledStartAt?: string | null;
  videoType?: "vod" | "upcoming" | "live" | null;
};

function parseTimestamp(value: string | null | undefined): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Date.parse(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function isScheduledPremiere(
  source: VideoReleaseDateSource,
  nowMs: number = Date.now(),
): boolean {
  if (source.videoType !== "upcoming") return false;
  const scheduledMs = parseTimestamp(source.scheduledStartAt);
  return scheduledMs !== null && scheduledMs > nowMs;
}

export function resolveVideoReleaseIso(
  source: VideoReleaseDateSource,
  nowMs: number = Date.now(),
): string | null {
  const scheduledMs = parseTimestamp(source.scheduledStartAt);
  const publishedMs = parseTimestamp(source.publishedAt);

  if (source.videoType === "upcoming" && scheduledMs !== null && scheduledMs > nowMs) {
    return source.scheduledStartAt!.trim();
  }

  if (publishedMs !== null) {
    return source.publishedAt!.trim();
  }

  if (scheduledMs !== null) {
    return source.scheduledStartAt!.trim();
  }

  return null;
}

export function formatVideoReleaseDateBadge(
  iso: string | null,
  options?: { premiere?: boolean; includeTime?: boolean },
): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;

  const label = new Intl.DateTimeFormat("cs-CZ", {
    timeZone: "Europe/Prague",
    day: "numeric",
    month: "numeric",
    year: "numeric",
    ...(options?.includeTime || options?.premiere
      ? { hour: "2-digit", minute: "2-digit", hour12: false }
      : {}),
  }).format(date);

  if (options?.premiere) {
    return `Premiéra ${label}`;
  }

  return label;
}

export function getVideoReleaseBadgeLabel(
  source: VideoReleaseDateSource,
  nowMs: number = Date.now(),
): string | null {
  const premiere = isScheduledPremiere(source, nowMs);
  const iso = resolveVideoReleaseIso(source, nowMs);
  return formatVideoReleaseDateBadge(iso, { premiere, includeTime: premiere });
}
