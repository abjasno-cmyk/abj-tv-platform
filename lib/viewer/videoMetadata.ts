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

export function placeholderVideoTitle(videoId: string): string {
  return `Video ${videoId}`;
}

export function isPlaceholderVideoTitle(videoId: string, title?: string | null): boolean {
  const trimmed = title?.trim();
  if (!trimmed) return true;
  return trimmed === placeholderVideoTitle(videoId);
}

export function resolveVideoTitle(videoId: string, title?: string | null): string {
  const trimmed = title?.trim();
  if (trimmed && trimmed.length > 0 && !isPlaceholderVideoTitle(videoId, trimmed)) {
    return trimmed;
  }
  return placeholderVideoTitle(videoId);
}

export function liveVideoHref(input: {
  videoId: string;
  title: string;
  channelName?: string | null;
}): string {
  const params = new URLSearchParams();
  params.set("videoId", input.videoId);
  params.set("title", input.title);
  if (input.channelName?.trim()) {
    params.set("channel", input.channelName.trim());
  }
  return `/live?${params.toString()}`;
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
