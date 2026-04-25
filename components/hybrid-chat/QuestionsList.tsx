"use client";

import type { HybridMessageDto } from "@/hooks/useHybridChat";

type QuestionsListProps = {
  items: HybridMessageDto[];
  currentUserId: string | null;
  pendingUpvoteIds: Set<string>;
  onUpvote: (messageId: string) => Promise<void>;
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

export function QuestionsList({
  items,
  currentUserId,
  pendingUpvoteIds,
  onUpvote,
}: QuestionsListProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3 text-[12px] text-abj-text2">
        Zatím žádné otázky.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const isOwn = currentUserId === item.user_id;
        const isAnswered = item.status === "ANSWERED";
        const pending = pendingUpvoteIds.has(item.id);
        return (
          <article
            key={item.id}
            className={`rounded-lg border p-2.5 ${
              isAnswered ? "border-emerald-500/30 bg-emerald-500/10" : "border-white/10 bg-white/[0.02]"
            }`}
          >
            <div className="mb-1 flex items-center justify-between gap-2">
              <p className="truncate text-[11px] font-semibold text-abj-gold">
                Uživatel {item.user_id.slice(0, 6)}
              </p>
              <span className="text-[10px] text-abj-text3">{formatClock(item.created_at)}</span>
            </div>
            <p className="text-[12px] leading-relaxed text-abj-text1">{item.content}</p>
            <div className="mt-2 flex items-center justify-between">
              <span
                className={`rounded border px-2 py-0.5 text-[10px] ${
                  isAnswered
                    ? "border-emerald-400/40 bg-emerald-500/20 text-emerald-100"
                    : "border-white/15 text-abj-text2"
                }`}
              >
                {isAnswered ? "Zodpovězeno" : "Ve frontě"}
              </span>
              <button
                type="button"
                disabled={isOwn || isAnswered || pending}
                onClick={() => {
                  void onUpvote(item.id);
                }}
                className="rounded border border-white/15 px-2 py-0.5 text-[11px] text-abj-text1 transition hover:border-abj-gold disabled:cursor-not-allowed disabled:opacity-50"
              >
                ⬆️ {item.upvotes_count}
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
