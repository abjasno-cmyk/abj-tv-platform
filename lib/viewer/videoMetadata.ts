export type ViewerVideoMeta = {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  channelName: string | null;
};

export function youtubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`;
}

export function resolveVideoThumbnail(videoId: string, thumbnailUrl?: string | null): string {
  const trimmed = thumbnailUrl?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : youtubeThumbnailUrl(videoId);
}

const VIDEO_ID_TITLE_PATTERN = /^Video\s+[A-Za-z0-9_-]{6,}$/;

export function isPlaceholderVideoTitle(title: string | null | undefined): boolean {
  const trimmed = title?.trim();
  if (!trimmed) return true;
  return VIDEO_ID_TITLE_PATTERN.test(trimmed);
}

export function resolveVideoTitle(
  videoId: string,
  title?: string | null,
  catalogTitle?: string | null,
): string {
  const trimmed = title?.trim();
  if (trimmed && trimmed.length > 0 && !isPlaceholderVideoTitle(trimmed)) {
    return trimmed;
  }
  const catalog = catalogTitle?.trim();
  if (catalog && catalog.length > 0) {
    return catalog;
  }
  return "Bez názvu";
}

export function videoSharePath(videoId: string): string {
  return `/videa/${encodeURIComponent(videoId.trim())}`;
}

export function videoShareUrl(videoId: string, origin?: string): string {
  const base = origin?.replace(/\/+$/, "") ?? "";
  return `${base}${videoSharePath(videoId)}`;
}

export function liveVideoHref(input: {
  videoId: string;
  title: string;
  channelName?: string | null;
}): string {
  return videoSharePath(input.videoId);
}

export function normalizeChannelFollowId(channelId: string | null | undefined, channelName: string): string {
  const trimmed = channelId?.trim();
  if (trimmed) return trimmed;
  return `source:${channelName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")}`;
}
