export const VIEWER_COMMENT_ENTITY_VIDEO = "video" as const;

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
};

export type CommentTreeNode = ViewerCommentRecord & {
  replies: CommentTreeNode[];
};

export function buildCommentTree(comments: ViewerCommentRecord[]): CommentTreeNode[] {
  const byId = new Map<string, CommentTreeNode>();
  for (const comment of comments) {
    byId.set(comment.id, { ...comment, replies: [] });
  }

  const roots: CommentTreeNode[] = [];
  for (const node of byId.values()) {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId)!.replies.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortNodes = (nodes: CommentTreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
    for (const node of nodes) {
      sortNodes(node.replies);
    }
  };
  sortNodes(roots);
  return roots;
}

export function countVisibleComments(comments: ViewerCommentRecord[]): number {
  return comments.length;
}
