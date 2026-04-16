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
