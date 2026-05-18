export const WALL_STATUSES = ["pending", "approved", "rejected", "hidden", "flagged"] as const;

export type WallStatus = (typeof WALL_STATUSES)[number];

export const WALL_SORTS = ["newest", "popular"] as const;

export type WallSort = (typeof WALL_SORTS)[number];

export type WallPost = {
  id: string;
  author_name: string;
  body: string;
  status: WallStatus;
  video_id: string | null;
  video_title: string | null;
  parent_id: string | null;
  likes_count: number;
  reports_count: number;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  approved_by: string | null;
};

export type CreateWallPostInput = {
  authorName: string;
  authorEmail?: string | null;
  body: string;
  videoId?: string | null;
  parentId?: string | null;
};

export type WallPostCreateResult = {
  post: WallPost;
  status: WallStatus;
  moderationReasons: string[];
};

export type WallPostListResult = {
  posts: WallPost[];
  limit: number;
  offset: number;
  sort: WallSort;
  hasMore: boolean;
};

export type WallIdentityMeta = {
  ipHash: string | null;
  userAgentHash: string | null;
  sessionHash: string;
};

