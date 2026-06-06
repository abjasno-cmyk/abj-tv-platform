import type { WallPost, WallSort } from "@/lib/wallTypes";

export type WallTreeNode = WallPost & {
  replies: WallTreeNode[];
};

export function buildWallTree(posts: WallPost[], sort: WallSort): WallTreeNode[] {
  const byId = new Map<string, WallTreeNode>();
  for (const post of posts) {
    byId.set(post.id, { ...post, replies: [] });
  }

  const roots: WallTreeNode[] = [];
  for (const node of byId.values()) {
    if (node.parent_id && byId.has(node.parent_id)) {
      byId.get(node.parent_id)!.replies.push(node);
    } else if (!node.parent_id) {
      roots.push(node);
    }
  }

  const sortNodes = (nodes: WallTreeNode[]) => {
    nodes.sort((a, b) => compareWallPosts(a, b, sort));
    for (const node of nodes) {
      node.replies.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }
  };
  sortNodes(roots);
  return roots;
}

function compareWallPosts(a: WallPost, b: WallPost, sort: WallSort): number {
  if (sort === "popular") {
    if (b.likes_count !== a.likes_count) return b.likes_count - a.likes_count;
  }
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}

export function formatWallPostTime(value: string): string {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "teď";
  const diffMs = Math.max(0, Date.now() - timestamp);
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "Právě teď";
  if (minutes < 60) return `Před ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Před ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Před ${days} d`;
  return new Intl.DateTimeFormat("cs-CZ", { day: "2-digit", month: "2-digit" }).format(timestamp);
}
