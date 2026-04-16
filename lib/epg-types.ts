export type ProgramItem = {
  time: string;
  title: string;
  channelName: string;
  thumbnail: string | null;
  videoId: string;
  isABJ: boolean;
  type?: "upcoming" | "vod" | "live" | "override";
};

export type DayProgram = {
  date: string;
  label: string;
  items: ProgramItem[];
};

export type ProgramOverrideItem = ProgramItem & {
  date: string;
};

export type CachedVideo = {
  id: string;
  source_id: string | null;
  channel_id: string;
  video_id: string;
  title: string;
  thumbnail: string | null;
  published_at: string | null;
  scheduled_start_at: string | null;
  video_type: "vod" | "upcoming" | "live";
  channel_name: string;
  is_abj: boolean;
  created_at: string;
};

export type ProgramBlockType =
  | "live"
  | "premiere"
  | "recorded"
  | "coming_up"
  | "fixed_abj"
  | "ceremonial";

export type ProgramBlock = {
  id: string;
  start: string;
  end: string;
  durationMin: number;
  type: ProgramBlockType;
  title: string;
  videoId?: string;
  channel: string;
  isABJ: boolean;
  priority: number;
  alternatives?: ProgramBlock[];
  thumbnail?: string;
};

export type ProgramOverrideRules = {
  forcedVideoIds?: string[];
  forcedPriorityChannels?: string[];
};

export type ProgramCandidateVideo = {
  videoId: string;
  title: string;
  channel: string;
  channelId?: string;
  isABJ: boolean;
  publishedAt?: string | null;
  scheduledStartTime?: string | null;
  actualStartTime?: string | null;
  durationMin: number;
  liveBroadcastContent: "live" | "upcoming" | "none";
  thumbnail?: string | null;
  metadata?: Record<string, unknown>;
};
