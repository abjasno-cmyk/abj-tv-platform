export type MyVeroxNotificationItem = {
  id: string;
  type: "comment_liked" | "comment_replied";
  actorName: string | null;
  commentExcerpt: string;
  entityType: string;
  entityId: string;
  href: string;
  createdAt: string;
  read: boolean;
};

export type MyVeroxRecentComment = {
  id: string;
  body: string;
  entityType: string;
  entityId: string;
  href: string;
  likeCount: number;
  replyCount: number;
  createdAt: string;
};

export type MyVeroxEngagementPayload = {
  unreadCount: number;
  notifications: MyVeroxNotificationItem[];
  recentComments: MyVeroxRecentComment[];
};

export type CommentEngagementResponse = {
  thankMessage: string;
  shareSuggested: boolean;
};
