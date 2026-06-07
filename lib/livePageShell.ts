import "server-only";

import type { LiveChannelGroup } from "@/components/abj/ChannelDirectory";
import { buildEPG } from "@/lib/buildEPG";
import { loadLiveChannelsForPage } from "@/lib/liveChannelsServer";
import type { DayProgram } from "@/lib/epg-types";

export type LivePageShell = {
  epg: DayProgram[];
  channels: LiveChannelGroup[];
};

export async function loadLivePageShell(): Promise<LivePageShell> {
  const channelsPromise = loadLiveChannelsForPage();
  let epg: DayProgram[] = [];

  try {
    epg = await buildEPG(7);
  } catch (error) {
    console.error("live-page-shell-buildEPG-failed", error);
  }

  const channels = await channelsPromise;
  return { epg, channels };
}
