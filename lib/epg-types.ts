export type ProgramItem = {
  time: string;
  title: string;
  channelName: string;
  thumbnail: string | null;
  videoId: string;
  isABJ: boolean;
  type?: "upcoming" | "vod" | "override";
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
  video_type: "vod" | "upcoming";
  channel_name: string;
  is_abj: boolean;
  created_at: string;
};
