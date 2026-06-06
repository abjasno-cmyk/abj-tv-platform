export const VIEWER_COMMENT_ENTITY_VIDEO = "video" as const;
export const VIEWER_COMMENT_ENTITY_OPINION = "opinion" as const;
export const VIEWER_COMMENT_LIKE_ENTITY = "comment" as const;

export type CommentSortMode = "popular" | "newest";
export type CommentFilterMode = "all" | "mine";

export type ViewerCommentRecord = {
  id: string;
  userId: string;
  entityType: string;
  entityId: string;
  parentId: string | null;
  body: string;
  status: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  authorName: string;
  authorAvatarUrl: string | null;
  isStaffHighlight: boolean;
  canModerate: boolean;
  likeCount: number;
  likedByMe: boolean;
};

export type CommentTreeNode = ViewerCommentRecord & {
  replies: CommentTreeNode[];
  replyToAuthorName: string | null;
};

export function countThreadReplies(node: CommentTreeNode): number {
  let total = node.replies.length;
  for (const reply of node.replies) {
    total += countThreadReplies(reply);
  }
  return total;
}

export function buildCommentTree(comments: ViewerCommentRecord[]): CommentTreeNode[] {
  const byId = new Map<string, CommentTreeNode>();
  for (const comment of comments) {
    byId.set(comment.id, { ...comment, replies: [], replyToAuthorName: null });
  }

  const roots: CommentTreeNode[] = [];
  for (const node of byId.values()) {
    if (node.parentId && byId.has(node.parentId)) {
      const parent = byId.get(node.parentId)!;
      node.replyToAuthorName = parent.authorName;
      parent.replies.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortReplies = (nodes: CommentTreeNode[]) => {
    nodes.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    for (const node of nodes) {
      sortReplies(node.replies);
    }
  };
  sortReplies(roots);
  return roots;
}

export function sortCommentRoots(roots: CommentTreeNode[], mode: CommentSortMode): CommentTreeNode[] {
  const sorted = [...roots];
  sorted.sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    if (mode === "popular") {
      const scoreA = a.likeCount + countThreadReplies(a) * 2;
      const scoreB = b.likeCount + countThreadReplies(b) * 2;
      if (scoreB !== scoreA) return scoreB - scoreA;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  return sorted;
}

export function filterCommentsForViewer(
  comments: ViewerCommentRecord[],
  mode: CommentFilterMode,
  viewerUserId: string | null,
): ViewerCommentRecord[] {
  if (mode !== "mine" || !viewerUserId) return comments;
  return comments.filter((comment) => comment.userId === viewerUserId);
}

export function countVisibleComments(comments: ViewerCommentRecord[]): number {
  return comments.length;
}
