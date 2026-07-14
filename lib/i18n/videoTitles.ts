import "server-only";

import type { LiveChannelGroup, LiveChannelVideo } from "@/components/abj/ChannelDirectory";
import { LOCALE_EN, type VeroxLocale } from "@/lib/i18n/config";
import { translateText } from "@/lib/i18n/translate";
import type { FeedVideo } from "@/lib/dayOverview";
import type { DayProgram, ProgramBlock, ProgramItem } from "@/lib/epg-types";
import type { ViewerLibraryVideo } from "@/lib/viewer/myVeroxLibrary";

const VIDEO_TITLE_TRANSLATION_MAX_LENGTH = 260;

export async function localizeVideoTitle(title: string, locale: VeroxLocale): Promise<string> {
  const trimmed = title.trim();
  if (!trimmed || locale !== LOCALE_EN) return title;
  const translated = await translateText(trimmed, "en", VIDEO_TITLE_TRANSLATION_MAX_LENGTH);
  return translated?.trim() || title;
}

async function localizeTitleMap(titles: string[], locale: VeroxLocale): Promise<Map<string, string>> {
  const uniqueTitles = [...new Set(titles.map((title) => title.trim()).filter(Boolean))];
  if (locale !== LOCALE_EN || uniqueTitles.length === 0) return new Map();

  const entries = await Promise.all(
    uniqueTitles.map(async (title) => [title, await localizeVideoTitle(title, locale)] as const),
  );
  return new Map(entries);
}

export async function localizeFeedVideos(videos: FeedVideo[], locale: VeroxLocale): Promise<FeedVideo[]> {
  const translations = await localizeTitleMap(videos.map((video) => video.title), locale);
  if (translations.size === 0) return videos;
  return videos.map((video) => ({
    ...video,
    title: translations.get(video.title.trim()) ?? video.title,
  }));
}

export async function localizeProgramDays(days: DayProgram[], locale: VeroxLocale): Promise<DayProgram[]> {
  const translations = await localizeTitleMap(
    days.flatMap((day) => day.items.map((item) => item.title)),
    locale,
  );
  if (translations.size === 0) return days;

  return days.map((day) => ({
    ...day,
    items: day.items.map((item): ProgramItem => ({
      ...item,
      title: translations.get(item.title.trim()) ?? item.title,
    })),
  }));
}

export async function localizeProgramBlock(block: ProgramBlock | null, locale: VeroxLocale): Promise<ProgramBlock | null> {
  if (!block || locale !== LOCALE_EN) return block;
  return {
    ...block,
    title: await localizeVideoTitle(block.title, locale),
    alternatives: block.alternatives ? await Promise.all(block.alternatives.map((item) => localizeProgramBlock(item, locale))) as ProgramBlock[] : undefined,
  };
}

export async function localizeLiveChannelVideos(
  videos: LiveChannelVideo[],
  locale: VeroxLocale,
): Promise<LiveChannelVideo[]> {
  const translations = await localizeTitleMap(videos.map((video) => video.title), locale);
  if (translations.size === 0) return videos;
  return videos.map((video) => ({
    ...video,
    title: translations.get(video.title.trim()) ?? video.title,
  }));
}

export async function localizeVideoTitleItems<T extends { title: string }>(
  items: T[],
  locale: VeroxLocale,
): Promise<T[]> {
  const translations = await localizeTitleMap(items.map((item) => item.title), locale);
  if (translations.size === 0) return items;
  return items.map((item) => ({
    ...item,
    title: translations.get(item.title.trim()) ?? item.title,
  }));
}

export async function localizeLiveChannels(
  channels: LiveChannelGroup[],
  locale: VeroxLocale,
): Promise<LiveChannelGroup[]> {
  if (locale !== LOCALE_EN || channels.length === 0) return channels;
  const translations = await localizeTitleMap(
    channels.flatMap((channel) => channel.videos.map((video) => video.title)),
    locale,
  );
  if (translations.size === 0) return channels;

  return channels.map((channel) => ({
    ...channel,
    videos: channel.videos.map((video) => ({
      ...video,
      title: translations.get(video.title.trim()) ?? video.title,
    })),
  }));
}

export async function localizeViewerLibraryVideos(
  videos: ViewerLibraryVideo[],
  locale: VeroxLocale,
): Promise<ViewerLibraryVideo[]> {
  const translations = await localizeTitleMap(videos.map((video) => video.title), locale);
  if (translations.size === 0) return videos;
  return videos.map((video) => ({
    ...video,
    title: translations.get(video.title.trim()) ?? video.title,
  }));
}
