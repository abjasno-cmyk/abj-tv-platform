"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { LiveCommentsVideoPicker } from "@/components/studio/LiveCommentsVideoPicker";
import type { LiveCommentBoardItem, LiveCommentsVideoContext } from "@/lib/studio/liveCommentsTypes";
import { authorInitials, formatRelativeCommentTime } from "@/lib/viewer/commentTime";

type LiveCommentsResponse = {
  video?: LiveCommentsVideoContext | null;
  questions?: LiveCommentBoardItem[];
  other?: LiveCommentBoardItem[];
  counts?: { total: number; questions: number; other: number };
  refreshedAt?: string;
  needsVideo?: boolean;
  error?: string;
};

type LiveCommentsBoardProps = {
  initialVideoId: string | null;
  initialVideoTitle: string | null;
  autoRefreshSeconds?: number;
};

const fetchOpts: RequestInit = { credentials: "include", cache: "no-store" };

function formatClockPrague(iso: string | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("cs-CZ", {
    timeZone: "Europe/Prague",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

function CommentTile({
  comment,
  variant,
  onModerate,
}: {
  comment: LiveCommentBoardItem;
  variant: "question" | "other";
  onModerate: (commentId: string, action: "hide" | "pin" | "unpin") => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);

  const runModerate = async (action: "hide" | "pin" | "unpin") => {
    setBusy(true);
    try {
      await onModerate(comment.id, action);
    } finally {
      setBusy(false);
    }
  };

  const isQuestion = variant === "question";

  return (
    <article
      className={
        isQuestion
          ? "rounded-xl border-2 border-[#ff6a00] bg-gradient-to-br from-[#2b1d12] to-[#1a120c] p-4 shadow-[0_0_24px_rgba(255,106,0,0.18)]"
          : "rounded-xl border border-[#2f3647] bg-[#0f131b] p-4"
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={
              isQuestion
                ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#ff6a00] text-sm font-bold text-white"
                : "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1f2738] text-xs font-semibold text-[#c8d5ea]"
            }
          >
            {authorInitials(comment.authorName)}
          </span>
          <div className="min-w-0">
            <p className={isQuestion ? "truncate text-sm font-semibold text-white" : "truncate text-xs font-medium text-[#d8e2f3]"}>
              {comment.authorName}
              {comment.isStaffHighlight ? (
                <span className="ml-2 rounded-full border border-[#3f5f4f] bg-[#142017] px-2 py-0.5 text-[10px] uppercase tracking-wide text-[#b4efc5]">
                  tým
                </span>
              ) : null}
            </p>
            <p className="text-[11px] text-[#8fa0bb]">{formatRelativeCommentTime(comment.createdAt)}</p>
          </div>
        </div>
        {isQuestion ? (
          <span className="shrink-0 rounded-full border border-[#ff6a00]/70 bg-[#ff6a00]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#ffd0ad]">
            Otázka
          </span>
        ) : null}
      </div>

      <p className={isQuestion ? "mt-3 text-base leading-relaxed text-[#fff6ef]" : "mt-2 text-sm leading-relaxed text-[#edf2fb]"}>
        {comment.body}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {comment.canModerate ? (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => void runModerate("hide")}
              className="rounded-md border border-[#5a3030] bg-[#2a1814] px-2 py-1 text-[11px] text-[#ffb3b3] hover:border-[#ff5a5a]/70 disabled:opacity-50"
            >
              Skrýt
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void runModerate(comment.isPinned ? "unpin" : "pin")}
              className="rounded-md border border-[#30384a] bg-[#101625] px-2 py-1 text-[11px] text-[#c8d5ea] hover:border-[#ff6a00]/70 disabled:opacity-50"
            >
              {comment.isPinned ? "Odepnout" : "Připnout"}
            </button>
          </>
        ) : null}
        {comment.likeCount > 0 ? (
          <span className="rounded-md border border-[#30384a] px-2 py-1 text-[11px] text-[#9fb0cc]">{comment.likeCount} lajků</span>
        ) : null}
      </div>
    </article>
  );
}

export function LiveCommentsBoard({
  initialVideoId,
  initialVideoTitle,
  autoRefreshSeconds = 8,
}: LiveCommentsBoardProps) {
  const router = useRouter();
  const { openLoginModal } = useAuth();
  const [videoIdInput, setVideoIdInput] = useState(initialVideoId ?? "");
  const [activeVideoId, setActiveVideoId] = useState(initialVideoId ?? "");
  const [videoTitle, setVideoTitle] = useState(initialVideoTitle);
  const [questions, setQuestions] = useState<LiveCommentBoardItem[]>([]);
  const [other, setOther] = useState<LiveCommentBoardItem[]>([]);
  const [counts, setCounts] = useState({ total: 0, questions: 0, other: 0 });
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (activeVideoId.trim()) params.set("videoId", activeVideoId.trim());
    return params.toString();
  }, [activeVideoId]);

  const loadComments = useCallback(async () => {
    if (!activeVideoId.trim()) {
      setLoading(false);
      setQuestions([]);
      setOther([]);
      setCounts({ total: 0, questions: 0, other: 0 });
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/studio/live-comments${queryString ? `?${queryString}` : ""}`, fetchOpts);
      const payload = (await response.json().catch(() => ({}))) as LiveCommentsResponse;

      if (response.status === 401) {
        openLoginModal({
          reason: "Moderátorská nástěnka komentářů je dostupná po přihlášení přes Google (abjasno@gmail.com).",
        });
        setError("Přihlaste se přes Google.");
        return;
      }

      if (!response.ok) {
        throw new Error(payload.error ?? "Načtení komentářů selhalo.");
      }

      setQuestions(payload.questions ?? []);
      setOther(payload.other ?? []);
      setCounts(payload.counts ?? { total: 0, questions: 0, other: 0 });
      setRefreshedAt(payload.refreshedAt ?? new Date().toISOString());
      if (payload.video?.title) {
        setVideoTitle(payload.video.title);
      }
      if (payload.video?.videoId) {
        setActiveVideoId(payload.video.videoId);
        setVideoIdInput(payload.video.videoId);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Načtení komentářů selhalo.");
    } finally {
      setLoading(false);
    }
  }, [activeVideoId, openLoginModal, queryString]);

  useEffect(() => {
    void loadComments();
  }, [loadComments]);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const timer = window.setInterval(() => {
      void loadComments();
    }, autoRefreshSeconds * 1000);
    return () => window.clearInterval(timer);
  }, [autoRefresh, autoRefreshSeconds, loadComments]);

  const moderateComment = async (commentId: string, action: "hide" | "pin" | "unpin") => {
    const response = await fetch("/api/viewer/comments/moderate", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commentId, action }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string; removed?: boolean };
    if (!response.ok) {
      throw new Error(payload.error ?? "Moderace se nezdařila.");
    }
    if (payload.removed) {
      setQuestions((prev) => prev.filter((item) => item.id !== commentId));
      setOther((prev) => prev.filter((item) => item.id !== commentId));
      setCounts((prev) => ({
        total: Math.max(0, prev.total - 1),
        questions: Math.max(0, prev.questions - (questions.some((item) => item.id === commentId) ? 1 : 0)),
        other: Math.max(0, prev.other - (other.some((item) => item.id === commentId) ? 1 : 0)),
      }));
      return;
    }
    await loadComments();
  };

  const selectVideo = (videoId: string, title?: string | null) => {
    const normalized = videoId.trim();
    if (!normalized) return;
    setActiveVideoId(normalized);
    setVideoIdInput(normalized);
    if (title?.trim()) {
      setVideoTitle(title.trim());
    }
    router.replace(`/studio/live-komentare?videoId=${encodeURIComponent(normalized)}`, { scroll: false });
  };

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-[#2f3647] bg-[#0f131b] p-4 md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[#ff6a00]">Moderace živého streamu</p>
            <h1 className="mt-1 text-xl font-semibold text-white md:text-2xl">Nástěnka komentářů</h1>
            <p className="mt-2 max-w-2xl text-sm text-[#b7c1d3]">
              Všechny komentáře k právě vysílanému videu na jednom místě. Otázky jsou zvýrazněné vlevo, ostatní komentáře vpravo.
            </p>
          </div>
          <div className="rounded-xl border border-[#2b3345] bg-[#0b0f16] px-4 py-3 text-xs text-[#c4cede]">
            <p>Celkem: {counts.total}</p>
            <p className="mt-1">Otázky: {counts.questions}</p>
            <p className="mt-1">Ostatní: {counts.other}</p>
            <p className="mt-1">Aktualizace: {formatClockPrague(refreshedAt ?? undefined)}</p>
          </div>
        </div>

        <LiveCommentsVideoPicker
          activeVideoId={activeVideoId}
          videoIdInput={videoIdInput}
          onVideoIdInputChange={setVideoIdInput}
          onSelectVideo={selectVideo}
        />

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void loadComments()}
            disabled={!activeVideoId.trim()}
            className="rounded-md border border-[#30384a] bg-[#101625] px-4 py-2 text-sm text-[#d8e2f3] hover:border-[#ff6a00]/70 disabled:opacity-50"
          >
            Obnovit komentáře
          </button>
          <label className="flex items-center gap-2 text-xs text-[#b7c1d3]">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(event) => setAutoRefresh(event.target.checked)}
              className="rounded border-[#30384a]"
            />
            Auto obnova ({autoRefreshSeconds}s)
          </label>
        </div>

        {videoTitle ? (
          <p className="mt-3 text-sm text-[#d8e2f3]">
            Video: <strong>{videoTitle}</strong>
            {activeVideoId ? (
              <>
                {" "}
                · ID: <code className="text-[#ffd0ad]">{activeVideoId}</code>
              </>
            ) : null}
          </p>
        ) : activeVideoId ? (
          <p className="mt-3 text-sm text-[#d8e2f3]">
            Video ID: <code className="text-[#ffd0ad]">{activeVideoId}</code>
          </p>
        ) : null}

        {error ? (
          <p className="mt-3 rounded-md border border-[#7a3d2b] bg-[#2a1814] px-3 py-2 text-xs text-[#ffcebd]">{error}</p>
        ) : null}
      </section>

      {!activeVideoId.trim() ? (
        <p className="rounded-xl border border-[#30384a] bg-[#0b0f16] px-4 py-5 text-sm text-[#b7c1d3]">
          Vyberte video z programu nebo podle názvu. Komentáře se zobrazí po výběru.
        </p>
      ) : loading && questions.length === 0 && other.length === 0 ? (
        <p className="text-sm text-[#9fb0cc]">Načítám komentáře…</p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-[#ff6a00]/40 bg-[#120e0a] p-4">
          <header className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-[#ffd0ad]">Otázky</h2>
            <span className="rounded-full border border-[#ff6a00]/60 bg-[#2b1d12] px-3 py-1 text-xs font-semibold text-[#ffd0ad]">
              {counts.questions}
            </span>
          </header>
          <div className="space-y-3">
            {questions.length === 0 ? (
              <p className="text-sm text-[#9fb0cc]">Zatím žádné otázky.</p>
            ) : (
              questions.map((comment) => (
                <CommentTile key={comment.id} comment={comment} variant="question" onModerate={moderateComment} />
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-[#2f3647] bg-[#0b0f16] p-4">
          <header className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-[#edf2fb]">Ostatní komentáře</h2>
            <span className="rounded-full border border-[#30384a] bg-[#101625] px-3 py-1 text-xs font-semibold text-[#c8d5ea]">
              {counts.other}
            </span>
          </header>
          <div className="space-y-3">
            {other.length === 0 ? (
              <p className="text-sm text-[#9fb0cc]">Zatím žádné další komentáře.</p>
            ) : (
              other.map((comment) => (
                <CommentTile key={comment.id} comment={comment} variant="other" onModerate={moderateComment} />
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
