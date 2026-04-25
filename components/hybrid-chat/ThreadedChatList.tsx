"use client";

import { FormEvent, useMemo, useState } from "react";

import type { HybridMessage } from "@/hooks/useHybridChat";

type ThreadedChatListProps = {
  items: HybridMessage[];
  onLike: (messageId: string) => void;
  onReply: (parentId: string, text: string) => Promise<void>;
};

type ThreadNode = HybridMessage & {
  replies: ThreadNode[];
};

function formatClock(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "--:--";
  return new Intl.DateTimeFormat("cs-CZ", {
    timeZone: "Europe/Prague",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function mapToTree(messages: HybridMessage[]): ThreadNode[] {
  const roots: ThreadNode[] = [];
  const byId = new Map<string, ThreadNode>();

  for (const message of messages) {
    byId.set(message.id, { ...message, replies: [] });
  }

  for (const node of byId.values()) {
    if (!node.parent_id) {
      roots.push(node);
      continue;
    }
    const parent = byId.get(node.parent_id);
    if (!parent) {
      roots.push(node);
      continue;
    }
    parent.replies.push(node);
  }

  const sortByDateAsc = (a: ThreadNode, b: ThreadNode) => Date.parse(a.created_at) - Date.parse(b.created_at);
  const sortRecursive = (nodes: ThreadNode[]) => {
    nodes.sort(sortByDateAsc);
    for (const node of nodes) {
      sortRecursive(node.replies);
    }
  };
  sortRecursive(roots);
  return roots;
}

function ReplyForm({ parentId, onReply }: { parentId: string; onReply: (parentId: string, text: string) => Promise<void> }) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const value = draft.trim();
    if (!value || sending) return;
    setSending(true);
    await onReply(parentId, value);
    setSending(false);
    setDraft("");
  };

  return (
    <form onSubmit={submit} className="mt-2 flex items-center gap-2">
      <input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Odpovědět..."
        className="h-8 flex-1 rounded border border-white/15 bg-white/[0.03] px-2 text-xs text-abj-text1 outline-none"
      />
      <button
        type="submit"
        disabled={sending}
        className="rounded border border-yellow-400/40 bg-yellow-500/10 px-2 py-1 text-[11px] text-yellow-100 disabled:opacity-50"
      >
        ↩
      </button>
    </form>
  );
}

function ThreadMessage({
  node,
  depth,
  onLike,
  onReply,
}: {
  node: ThreadNode;
  depth: number;
  onLike: (messageId: string) => void;
  onReply: (parentId: string, text: string) => Promise<void>;
}) {
  const [replyOpen, setReplyOpen] = useState(false);

  return (
    <article className="abj-msg-appear" style={{ marginLeft: `${Math.min(depth, 3) * 14}px` }}>
      <div className="rounded-lg border border-white/10 bg-white/[0.02] p-2.5">
        <div className="mb-1 flex items-center justify-between gap-2">
          <p className="truncate text-[11px] font-semibold text-abj-gold">{`Uživatel ${node.user_id.slice(0, 6)}`}</p>
          <span className="text-[10px] text-abj-text3">{formatClock(node.created_at)}</span>
        </div>
        <p className="text-[12px] leading-relaxed text-abj-text1">{node.content}</p>
        <div className="mt-2 flex items-center gap-3 text-[11px]">
          <button
            type="button"
            className="rounded border border-white/15 px-2 py-0.5 text-abj-text2 transition hover:text-abj-text1"
            onClick={() => onLike(node.id)}
          >
            ❤️ {node.likes_count}
          </button>
          <button
            type="button"
            className="rounded border border-white/15 px-2 py-0.5 text-abj-text2 transition hover:text-abj-text1"
            onClick={() => setReplyOpen((prev) => !prev)}
          >
            Odpovědět
          </button>
        </div>
        {replyOpen ? <ReplyForm parentId={node.id} onReply={onReply} /> : null}
      </div>
      {node.replies.length > 0 ? (
        <div className="mt-2 space-y-2">
          {node.replies.map((reply) => (
            <ThreadMessage key={reply.id} node={reply} depth={depth + 1} onLike={onLike} onReply={onReply} />
          ))}
        </div>
      ) : null}
    </article>
  );
}

export function ThreadedChatList({ items, onLike, onReply }: ThreadedChatListProps) {
  const threaded = useMemo(() => mapToTree(items), [items]);

  if (threaded.length === 0) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3 text-[12px] text-abj-text2">
        Zatím žádné zprávy v kecárně.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {threaded.map((node) => (
        <ThreadMessage key={node.id} node={node} depth={0} onLike={onLike} onReply={onReply} />
      ))}
    </div>
  );
}
