/** YouTube Shorts are at most 60 seconds long. */
export const YOUTUBE_SHORT_MAX_SECONDS = 60;

export type ShortDetectionInput = {
  title?: string | null;
  durationMin?: number | null;
  durationIso?: string | null;
  isShort?: boolean | null;
};

export function parseIsoDurationSeconds(value?: string | null): number | null {
  if (!value || typeof value !== "string") return null;
  const match = /^P(?:\d+Y)?(?:\d+M)?(?:\d+D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/i.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);
  const total = hours * 3600 + minutes * 60 + seconds;
  return Number.isFinite(total) && total >= 0 ? total : null;
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function hasShortTextHint(title?: string | null): boolean {
  if (!title?.trim()) return false;
  const normalized = normalizeText(title);
  return normalized.includes("#shorts") || normalized.includes(" shorts ") || normalized.startsWith("shorts ");
}

export function isYouTubeShort(input: ShortDetectionInput): boolean {
  if (input.isShort === true) return true;

  const durationSeconds =
    parseIsoDurationSeconds(input.durationIso) ??
    (typeof input.durationMin === "number" && Number.isFinite(input.durationMin)
      ? Math.round(input.durationMin * 60)
      : null);

  if (durationSeconds !== null && durationSeconds > 0 && durationSeconds <= YOUTUBE_SHORT_MAX_SECONDS) {
    return true;
  }

  return hasShortTextHint(input.title);
}

export function filterNonShortVideos<T extends ShortDetectionInput>(videos: T[]): T[] {
  return videos.filter((video) => !isYouTubeShort(video));
}
