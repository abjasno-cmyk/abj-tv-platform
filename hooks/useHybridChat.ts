"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type HybridMessageType = "CHAT" | "QUESTION";
export type HybridMessageStatus = "PENDING" | "ANSWERED" | "SENT_TO_YT";

export type HybridChatMessage = {
  id: string;
  stream_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  type: HybridMessageType;
  status: HybridMessageStatus;
  created_at: string;
  likes_count: number;
  upvotes_count: number;
};

type LoadResult = {
  items: HybridChatMessage[];
};

type UseHybridChatResult = {
  streamId: string | null;
  userId: string | null;
  loading: boolean;
  posting: boolean;
  replyTargetId: string | null;
  chatMessages: HybridChatMessage[];
  questionMessages: HybridChatMessage[];
  postMessage: (params: {
    content: string;
    type: HybridMessageType;
    parentId?: string | null;
  }) => Promise<{ ok: boolean; error?: string }>;
  likeMessage: (messageId: string) => Promise<{ ok: boolean; error?: string }>;
  upvoteQuestion: (messageId: string) => Promise<{ ok: boolean; error?: string }>;
  setReplyTargetId: (messageId: string | null) => void;
  likedIds: Set<string>;
  upvotedIds: Set<string>;
  refresh: () => Promise<void>;
};

async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with ${response.status}`);
  }
  return (await response.json()) as T;
}

function sortByNewest(items: HybridChatMessage[]): HybridChatMessage[] {
  return [...items].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
}

function sortQuestions(items: HybridChatMessage[]): HybridChatMessage[] {
  return [...items].sort((a, b) => {
    if (b.upvotes_count !== a.upvotes_count) return b.upvotes_count - a.upvotes_count;
    return Date.parse(b.created_at) - Date.parse(a.created_at);
  });
}

export function useHybridChat(): UseHybridChatResult {
  const [streamId, setStreamId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<HybridChatMessage[]>([]);
  const [questionMessages, setQuestionMessages] = useState<HybridChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [replyTargetId, setReplyTargetId] = useState<string | null>(null);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [upvotedIds, setUpvotedIds] = useState<Set<string>>(new Set());

  const loadAll = useCallback(async (targetStreamId: string) => {
    const [chatRes, questionRes] = await Promise.all([
      fetchJson<LoadResult>(`/api/hybrid-chat/messages?stream_id=${encodeURIComponent(targetStreamId)}&type=CHAT`),
      fetchJson<LoadResult>(`/api/hybrid-chat/messages?stream_id=${encodeURIComponent(targetStreamId)}&type=QUESTION`),
    ]);
    setChatMessages(sortByNewest(chatRes.items));
    setQuestionMessages(sortQuestions(questionRes.items));
  }, []);

  const refresh = useCallback(async () => {
    if (!streamId) return;
    await loadAll(streamId);
  }, [loadAll, streamId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchJson<{ stream: { id: string } }>("/api/hybrid-chat/streams/active")
      .then(async (payload) => {
        if (cancelled) return;
        setStreamId(payload.stream.id);
        await loadAll(payload.stream.id);
      })
      .catch(() => {
        if (cancelled) return;
        setStreamId(null);
        setUserId(null);
        setChatMessages([]);
        setQuestionMessages([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [loadAll]);

  useEffect(() => {
    let cancelled = false;
    void fetchJson<{ userId: string }>("/api/hybrid-chat/realtime/token")
      .then((payload) => {
        if (!cancelled) setUserId(payload.userId);
      })
      .catch(() => {
        if (!cancelled) setUserId(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!streamId) return;
    const client = createSupabaseBrowserClient();
    const channel = client.channel(`hybrid-chat:${streamId}`);
    channel.on("broadcast", { event: "chat-event" }, () => {
      void refresh();
    });
    void channel.subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [refresh, streamId]);

  const postMessage = useCallback(
    async (params: {
      content: string;
      type: HybridMessageType;
      parentId?: string | null;
    }) => {
      if (!streamId) return { ok: false, error: "Aktivní stream není k dispozici." };
      try {
        setPosting(true);
        await fetchJson("/api/hybrid-chat/messages", {
          method: "POST",
          body: JSON.stringify({
            stream_id: streamId,
            content: params.content,
            type: params.type,
            parent_id: params.parentId ?? null,
          }),
        });
        await refresh();
        return { ok: true };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : "Nepodařilo se odeslat zprávu.",
        };
      } finally {
        setPosting(false);
      }
    },
    [refresh, streamId]
  );

  const likeMessage = useCallback(
    async (messageId: string) => {
      try {
        await fetchJson(`/api/hybrid-chat/messages/${encodeURIComponent(messageId)}/like`, {
          method: "POST",
        });
        setLikedIds((prev) => {
          const next = new Set(prev);
          next.add(messageId);
          return next;
        });
        await refresh();
        return { ok: true };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : "Nepodařilo se přidat like.",
        };
      }
    },
    [refresh]
  );

  const upvoteQuestion = useCallback(
    async (messageId: string) => {
      try {
        await fetchJson(`/api/hybrid-chat/messages/${encodeURIComponent(messageId)}/upvote`, {
          method: "POST",
        });
        setUpvotedIds((prev) => {
          const next = new Set(prev);
          next.add(messageId);
          return next;
        });
        await refresh();
        return { ok: true };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : "Nepodařilo se přidat hlas.",
        };
      }
    },
    [refresh]
  );

  return useMemo(
    () => ({
      streamId,
      userId,
      loading,
      posting,
      replyTargetId,
      chatMessages,
      questionMessages,
      postMessage,
      likeMessage,
      upvoteQuestion,
      setReplyTargetId,
      likedIds,
      upvotedIds,
      refresh,
    }),
    [
      chatMessages,
      likeMessage,
      likedIds,
      loading,
      postMessage,
      posting,
      questionMessages,
      refresh,
      replyTargetId,
      setReplyTargetId,
      streamId,
      upvoteQuestion,
      upvotedIds,
      userId,
    ]
  );
}

