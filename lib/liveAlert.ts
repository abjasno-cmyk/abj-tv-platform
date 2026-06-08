import type { ProgramBlock } from "@/lib/epg-types";

export type LiveAlertCandidate = {
  video_id: string;
  title: string;
  channel: string;
  thumbnail: string | null;
  is_premiere: boolean;
  is_abj: boolean;
  started_at: string;
};

export function pickLiveAlertBlock(timeline: ProgramBlock[], now: Date): ProgramBlock | null {
  const nowTs = now.getTime();
  const active = timeline
    .filter((block) => {
      if (!block.videoId) return false;
      if (block.type !== "live") return false;
      if (!block.isABJ) return false;
      const startTs = new Date(block.start).getTime();
      const endTs = new Date(block.end).getTime();
      return Number.isFinite(startTs) && Number.isFinite(endTs) && startTs <= nowTs && nowTs < endTs;
    })
    .sort((a, b) => b.priority - a.priority || new Date(a.start).getTime() - new Date(b.start).getTime());
  return active[0] ?? null;
}

export function toLiveAlertCandidate(block: ProgramBlock): LiveAlertCandidate {
  return {
    video_id: block.videoId!,
    title: block.title,
    channel: block.channel,
    thumbnail: block.thumbnail ?? null,
    is_premiere: block.type === "premiere",
    is_abj: block.isABJ,
    started_at: block.start,
  };
}

export function shouldShowLiveAlert(
  candidate: LiveAlertCandidate | null | undefined,
  currentVideoId: string | null,
  dismissedIds: ReadonlySet<string>,
): boolean {
  if (!candidate?.video_id) return false;
  if (!candidate.is_abj) return false;
  if (candidate.is_premiere) return false;
  if (dismissedIds.has(candidate.video_id)) return false;
  if (currentVideoId && currentVideoId === candidate.video_id) return false;
  return true;
}
