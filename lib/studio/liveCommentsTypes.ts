import type { ViewerCommentRecord } from "@/lib/viewer/comments";

export type LiveCommentBoardItem = ViewerCommentRecord & {
  isQuestion: boolean;
};

export type LiveCommentsVideoContext = {
  videoId: string;
  title: string | null;
  channel: string | null;
  type: string | null;
  isABJ: boolean;
  source: "now_playing" | "query";
};

export type LiveCommentsBoardPayload = {
  video: LiveCommentsVideoContext | null;
  comments: LiveCommentBoardItem[];
  questions: LiveCommentBoardItem[];
  other: LiveCommentBoardItem[];
  counts: { total: number; questions: number; other: number };
  refreshedAt: string;
};
