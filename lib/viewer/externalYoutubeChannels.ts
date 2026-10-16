import type { DayProgram } from "@/lib/epg-types";
import { TENANT, type TenantId } from "@/lib/tenant";

/** Canonical YouTube channel for the Verox-only exception (not hosted on Verox). */
export const EXTERNAL_YOUTUBE_CHANNEL_URL =
  "https://www.youtube.com/@spoleksvobodneradio3681";

const EXTERNAL_YOUTUBE_HANDLE = "spoleksvobodneradio3681";
const EXTERNAL_YOUTUBE_NORMALIZED_NAME = "spolek svobodne radio";

export function normalizeChannelName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export function extractYoutubeHandle(channelUrl: string | null | undefined): string | null {
  const raw = channelUrl?.trim();
  if (!raw) return null;

  const fromPath = (pathname: string): string | null => {
    const segment = pathname.split("/").filter(Boolean)[0];
    if (segment?.startsWith("@") && segment.length > 1) {
      return segment.slice(1).toLowerCase();
    }
    return null;
  };

  try {
    const parsed = new URL(raw);
    const handle = fromPath(parsed.pathname);
    if (handle) return handle;
  } catch {
    // Fall through to regex — channelUrl may be a bare @handle.
  }

  const match = raw.match(/@([A-Za-z0-9._-]+)/);
  return match?.[1]?.toLowerCase() ?? null;
}

export function isExternalYoutubeOnlyChannel(
  input: { channelName?: string | null; channelUrl?: string | null },
  tenantId: TenantId = TENANT.id,
): boolean {
  if (tenantId !== "verox") return false;

  const handle = extractYoutubeHandle(input.channelUrl);
  if (handle === EXTERNAL_YOUTUBE_HANDLE) return true;

  const name = input.channelName ? normalizeChannelName(input.channelName) : "";
  return name === EXTERNAL_YOUTUBE_NORMALIZED_NAME;
}

export function externalYoutubeChannelUrl(input?: { channelUrl?: string | null }): string {
  const url = input?.channelUrl?.trim();
  if (url && extractYoutubeHandle(url) === EXTERNAL_YOUTUBE_HANDLE) {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        return url;
      }
    } catch {
      // Use the canonical channel URL below.
    }
  }
  return EXTERNAL_YOUTUBE_CHANNEL_URL;
}

export function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId.trim())}`;
}

/** Drop this channel from Verox listings (kanály, live carousel, feed). ProudX unchanged. */
export function filterVeroxCatalogChannels<T extends { channelName?: string | null; channelUrl?: string | null }>(
  channels: T[],
  tenantId: TenantId = TENANT.id,
): T[] {
  return channels.filter(
    (channel) => !isExternalYoutubeOnlyChannel({ channelName: channel.channelName, channelUrl: channel.channelUrl }, tenantId),
  );
}

export function filterVeroxFeedVideos<T extends { channel?: string | null; channelName?: string | null }>(
  videos: T[],
  tenantId: TenantId = TENANT.id,
): T[] {
  return videos.filter(
    (video) =>
      !isExternalYoutubeOnlyChannel(
        { channelName: video.channelName ?? video.channel ?? null },
        tenantId,
      ),
  );
}

export function filterVeroxProgramDays(days: DayProgram[], tenantId: TenantId = TENANT.id): DayProgram[] {
  return days.map((day) => ({
    ...day,
    items: day.items.filter((item) => !isExternalYoutubeOnlyChannel({ channelName: item.channelName }, tenantId)),
  }));
}

/** Opens the YouTube channel in a new tab. Returns true when the click was handled. */
export function openExternalYoutubeChannel(
  input: { channelName?: string | null; channelUrl?: string | null },
  tenantId: TenantId = TENANT.id,
): boolean {
  if (typeof window === "undefined") return false;
  if (!isExternalYoutubeOnlyChannel(input, tenantId)) return false;
  window.open(externalYoutubeChannelUrl(input), "_blank", "noopener,noreferrer");
  return true;
}
