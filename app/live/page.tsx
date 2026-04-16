import { buildEPG } from "@/lib/buildEPG";
import LivePage from "@/app/live/LivePage";
import type { DayProgram, ProgramItem } from "@/lib/epg-types";

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

function chooseInitialItem(epg: DayProgram[]): ProgramItem | null {
  const todayItems = epg[0]?.items ?? [];
  if (todayItems.length === 0) {
    return null;
  }

  const currentTime = getPragueTimeLabel(new Date());
  let lastPlayable: ProgramItem | null = null;
  for (const item of todayItems) {
    if (item.time <= currentTime) {
      lastPlayable = item;
    }
  }

  return lastPlayable ?? todayItems[0] ?? null;
}

export default async function LivePageServer() {
  let epg: DayProgram[] = [];

  try {
    epg = await buildEPG(7);
  } catch (error) {
    console.error("live-page-buildEPG-failed", error);
  }

  const initialItem = chooseInitialItem(epg);
  const initialVideoId = initialItem?.videoId ?? null;
  const initialTitle = initialItem?.title ?? "Dnes není plánované vysílání";
  const initialChannelName = initialItem?.channelName ?? "";

  return (
    <LivePage
      epg={epg}
      initialVideoId={initialVideoId}
      initialTitle={initialTitle}
      initialChannelName={initialChannelName}
    />
  );
}
