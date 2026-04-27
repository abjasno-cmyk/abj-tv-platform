"use client";

import { FormEvent, useState } from "react";

import { QuestionsList } from "@/components/hybrid-chat/QuestionsList";
import { ThreadedChatList } from "@/components/hybrid-chat/ThreadedChatList";
import { useHybridChat } from "@/hooks/useHybridChat";

type TabKey = "chat" | "questions";

export function HybridChatPanel() {
  const [tab, setTab] = useState<TabKey>("chat");
  const [draft, setDraft] = useState("");
  const [errorText, setErrorText] = useState<string | null>(null);
  const [pendingLikeIds, setPendingLikeIds] = useState<Set<string>>(new Set());
  const [pendingUpvoteIds, setPendingUpvoteIds] = useState<Set<string>>(new Set());
  const {
    streamId,
    loading,
    chatMessages,
    questionMessages,
    postMessage,
    likeMessage,
    upvoteQuestion,
  } = useHybridChat();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content) return;
    setErrorText(null);
    const result = await postMessage({
      content,
      type: tab === "chat" ? "CHAT" : "QUESTION",
      parentId: null,
    });
    if (!result.ok) {
      setErrorText(result.error ?? "Akce se nepodařila.");
      return;
    }
    setDraft("");
  };

  const onLike = async (messageId: string) => {
    setPendingLikeIds((prev) => new Set(prev).add(messageId));
    try {
      const result = await likeMessage(messageId);
      if (!result.ok) {
        setErrorText(result.error ?? "Nepodařilo se přidat like.");
      }
    } finally {
      setPendingLikeIds((prev) => {
        const next = new Set(prev);
        next.delete(messageId);
        return next;
      });
    }
  };

  const onUpvote = async (messageId: string) => {
    setPendingUpvoteIds((prev) => new Set(prev).add(messageId));
    try {
      const result = await upvoteQuestion(messageId);
      if (!result.ok) {
        setErrorText(result.error ?? "Nepodařilo se přidat hlas.");
      }
    } finally {
      setPendingUpvoteIds((prev) => {
        const next = new Set(prev);
        next.delete(messageId);
        return next;
      });
    }
  };

  return (
    <aside className="flex h-full w-[320px] shrink-0 flex-col overflow-hidden border-l border-abj-goldDim bg-abj-hospoda">
      <header className="border-b border-abj-goldDim px-[15px] pb-[10px] pt-[13px]">
        <div className="flex items-center justify-between">
          <p className="font-[var(--font-sans)] text-[9px] uppercase tracking-[0.20em] text-abj-gold">
            Hybrid chat
          </p>
          <p className="text-[10px] text-abj-text2">{streamId ? "LIVE" : "OFFLINE"}</p>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          <button
            type="button"
            className={`rounded-md border px-2 py-1 text-[11px] transition ${
              tab === "chat"
                ? "border-yellow-400/50 bg-yellow-500/15 text-yellow-100"
                : "border-white/10 text-abj-text2 hover:text-abj-text1"
            }`}
            onClick={() => setTab("chat")}
          >
            Kecárna
          </button>
          <button
            type="button"
            className={`rounded-md border px-2 py-1 text-[11px] transition ${
              tab === "questions"
                ? "border-yellow-400/50 bg-yellow-500/15 text-yellow-100"
                : "border-white/10 text-abj-text2 hover:text-abj-text1"
            }`}
            onClick={() => setTab("questions")}
          >
            Otázky na hosta
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-[12px] py-[10px]">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }, (_, idx) => (
              <div key={`hybrid-chat-skeleton-${idx}`} className="h-14 animate-pulse rounded bg-white/5" />
            ))}
          </div>
        ) : tab === "chat" ? (
          <ThreadedChatList
            messages={chatMessages}
            currentUserId={null}
            onLike={onLike}
            onReply={async (parentId, text) => {
              const result = await postMessage({
                content: text,
                type: "CHAT",
                parentId,
              });
              if (!result.ok) {
                setErrorText(result.error ?? "Nepodařilo se odeslat odpověď.");
              }
            }}
            pendingLikeIds={pendingLikeIds}
            pendingReplyParentId={null}
          />
        ) : (
          <QuestionsList
            items={questionMessages}
            currentUserId={null}
            onUpvote={onUpvote}
            pendingUpvoteIds={pendingUpvoteIds}
          />
        )}
      </div>

      <footer className="border-t border-abj-goldDim px-[12px] py-[10px]">
        <form className="space-y-2" onSubmit={handleSubmit}>
          <textarea
            rows={2}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={tab === "chat" ? "Napište zprávu..." : "Položte otázku na hosta..."}
            className="w-full resize-none rounded border border-white/15 bg-white/[0.03] px-2.5 py-2 text-[12px] text-abj-text1 outline-none placeholder:text-abj-text3"
          />
          {errorText ? <p className="text-[10px] text-rose-200">{errorText}</p> : null}
          <button
            type="submit"
            disabled={!streamId}
            className="w-full rounded border border-yellow-400/40 bg-yellow-500/10 px-2.5 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-yellow-100 transition hover:bg-yellow-500/20 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {tab === "chat" ? "Odeslat do kecárny" : "Položit otázku"}
          </button>
        </form>
      </footer>
    </aside>
  );
}
