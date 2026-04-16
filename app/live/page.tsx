import { buildEPG } from "@/lib/buildEPG";
import { getNowPlaying, getProgram } from "@/lib/programEngine";
import LivePage from "@/app/live/LivePage";
import type { DayProgram, ProgramBlock, ProgramItem } from "@/lib/epg-types";

export const dynamic = "force-dynamic";

function toParts(date: Date, options: Intl.DateTimeFormatOptions): Record<string, string> {
  return new Intl.DateTimeFormat("cs-CZ", {
    timeZone: "Europe/Prague",
    ...options,
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, part) => {
      if (part.type !== "literal") {
        acc[part.type] = part.value;
      }
      return acc;
    }, {});
}

function getPragueTimeLabel(date: Date): string {
  const parts = toParts(date, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${parts.hour}:${parts.minute}`;
}

function getPragueDateKey(date: Date): string {
  const parts = toParts(date, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function getPragueDayLabel(date: Date): string {
  const parts = toParts(date, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const label = `${parts.weekday} ${parts.day}. ${parts.month}`;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function toProgramItemType(block: ProgramBlock): ProgramItem["type"] {
  if (block.type === "live") return "live";
  if (block.type === "premiere") return "upcoming";
  return "vod";
}

function mapTimelineToDays(timeline: ProgramBlock[]): DayProgram[] {
  const byDate = new Map<string, DayProgram>();
  for (const block of timeline) {
    if (!block.videoId) continue;

    const startDate = new Date(block.start);
    if (Number.isNaN(startDate.getTime())) continue;

    const dateKey = getPragueDateKey(startDate);
    const existing = byDate.get(dateKey);
    if (!existing) {
      byDate.set(dateKey, {
        date: dateKey,
        label: getPragueDayLabel(startDate),
        items: [],
      });
    }

    byDate.get(dateKey)?.items.push({
      time: getPragueTimeLabel(startDate),
      title: block.title,
      channelName: block.channel,
      thumbnail: block.thumbnail ?? null,
      videoId: block.videoId,
      isABJ: block.isABJ,
      type: toProgramItemType(block),
    });
  }

  return [...byDate.values()]
    .map((day) => ({
      ...day,
      items: day.items.sort((a, b) => a.time.localeCompare(b.time)),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function chooseInitialItem(epg: DayProgram[]): ProgramItem | null {
  const currentTime = getPragueTimeLabel(new Date());
  const todayItems = epg[0]?.items ?? [];

  if (todayItems.length > 0) {
    let lastPlayable: ProgramItem | null = null;
    for (const item of todayItems) {
      if (item.time <= currentTime) {
        lastPlayable = item;
      }
    }
    return lastPlayable ?? todayItems[0] ?? null;
  }

  // If there is no schedule entry for "today", start with the first
  // available item from the next populated day.
  for (const day of epg) {
    if (day.items.length > 0) {
      return day.items[0] ?? null;
    }
  }

  return null;
}

function findItemByVideoId(epg: DayProgram[], videoId: string): ProgramItem | null {
  for (const day of epg) {
    const found = day.items.find((item) => item.videoId === videoId);
    if (found) return found;
  }
  return null;
}

export default async function LivePageServer(
  {
    searchParams,
  }: {
    searchParams?: Promise<Record<string, string | string[] | undefined>>;
  } = {}
) {
  let epg: DayProgram[] = [];
  let v3NowPlaying: ProgramBlock | null = null;

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const rawVideoId = resolvedSearchParams?.videoId;
  const requestedVideoId = Array.isArray(rawVideoId) ? rawVideoId[0] : rawVideoId;

  try {
    const timeline = await getProgram();
    v3NowPlaying = await getNowPlaying();
    epg = mapTimelineToDays(timeline);
  } catch (error) {
    console.error("live-page-v3-program-failed", error);
  }

  if (epg.length === 0 || epg.every((day) => day.items.length === 0)) {
    try {
      epg = await buildEPG(7);
    } catch (error) {
      console.error("live-page-buildEPG-fallback-failed", error);
    }
  }

  const initialFromNowPlaying =
    v3NowPlaying?.videoId && v3NowPlaying.title
      ? {
          videoId: v3NowPlaying.videoId,
          title: v3NowPlaying.title,
          channelName: v3NowPlaying.channel,
        }
      : null;

  const requestedItem = requestedVideoId ? findItemByVideoId(epg, requestedVideoId) : null;
  const initialItem = chooseInitialItem(epg);
  const initialVideoId = requestedItem?.videoId ?? initialFromNowPlaying?.videoId ?? initialItem?.videoId ?? null;
  const initialTitle =
    requestedItem?.title ??
    initialFromNowPlaying?.title ??
    initialItem?.title ??
    "Dnes není plánované vysílání";
  const initialChannelName =
    requestedItem?.channelName ??
    initialFromNowPlaying?.channelName ??
    initialItem?.channelName ??
    "";

  return (
    <LivePage
      epg={epg}
      initialVideoId={initialVideoId}
      initialTitle={initialTitle}
      initialChannelName={initialChannelName}
    />
  );
}
