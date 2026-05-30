"use client";

import { VeroxArrowLink } from "@/components/abj/VeroxArrowLink";
import { VKostceActionButtons } from "@/components/v-kostce/VKostceActionButtons";
import type { VKostceFeedItem } from "@/components/v-kostce/v-kostce-feed-utils";
import type { AbjXComment, AbjXSocialStats } from "@/lib/api";

type VKostceCardProps = {
  item: VKostceFeedItem;
  isAuthenticated: boolean;
  social: AbjXSocialStats;
  isReacting: boolean;
  shareHint?: string;
  wallOpen: boolean;
  wallComments: AbjXComment[];
  wallLoading: boolean;
  wallError?: string;
  wallSubmitting: boolean;
  wallDraft: string;
  onWallDraftChange: (value: string) => void;
  onReact: () => void;
  onComments: () => void;
  onShare: () => void;
  onAddComment: () => void;
};

function formatWallCommentAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "teď";
  return new Intl.DateTimeFormat("cs-CZ", {
    timeZone: "Europe/Prague",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function VKostceCard({
  item,
  isAuthenticated,
  social,
  isReacting,
  shareHint,
  wallOpen,
  wallComments,
  wallLoading,
  wallError,
  wallSubmitting,
  wallDraft,
  onWallDraftChange,
  onReact,
  onComments,
  onShare,
  onAddComment,
}: VKostceCardProps) {
  const videoHref = item.videoId ? `/live?videoId=${encodeURIComponent(item.videoId)}` : "/live";
  const reacted = social.reactedByMe;
  const gridClass = isAuthenticated ? "verox-vkostce-card-grid verox-vkostce-card-grid--auth" : "verox-vkostce-card-grid";

  return (
    <article className="verox-vkostce-card py-[clamp(12px,2vw,20px)]">
      <div className={gridClass}>
        <div className="verox-vkostce-date flex flex-col items-start justify-start">
          <p className="verox-vkostce-month verox-font-myriad-bold uppercase tracking-[0.05em] text-[#717171]">{item.monthLabel}</p>
          <p className="verox-vkostce-day verox-font-myriad-bold leading-none tracking-[0.05em] text-[#F37021]">{item.dayLabel}</p>
        </div>

        <div className="verox-vkostce-content min-w-0">
          <h2 className="verox-vkostce-headline verox-font-myriad-bold tracking-[0.05em] text-[#303030]">{item.headline}</h2>
          <p className="verox-vkostce-source verox-font-myriad-bold mt-1 tracking-[0.05em] text-[#717171]">{item.sourceLine}</p>
          {(item.lead || item.body) && (
            <div className="verox-vkostce-perex verox-font-myriad-regular mt-2 tracking-[0.05em] text-[#717171]">
              {item.lead ? <p className="leading-[1.4]">{item.lead}</p> : null}
              {item.body ? <p className="mt-3 leading-[1.4]">{item.body}</p> : null}
            </div>
          )}
          <div className="verox-vkostce-cta mt-[clamp(12px,2.5vw,20px)]">
            <VeroxArrowLink href={videoHref} label="Spustit video" className="verox-vkostce-cta-link" />
          </div>
        </div>

        {isAuthenticated ? (
          <div className="verox-vkostce-actions-col">
            <VKostceActionButtons
              item={item}
              reacted={reacted}
              isReacting={isReacting}
              onReact={onReact}
              onComments={onComments}
              onShare={onShare}
            />
          </div>
        ) : null}
      </div>

      {shareHint ? (
        <p className="verox-font-myriad-regular mt-2 pl-[23.1%] text-[clamp(0.7rem,1.5vw,0.85rem)] tracking-[0.05em] text-[#717171]">
          {shareHint}
        </p>
      ) : null}

      {wallOpen ? (
        <div className="verox-vkostce-wall mt-3 border border-[#717171]/40 bg-white p-2">
          <h3 className="verox-font-myriad-bold text-[clamp(0.75rem,1.5vw,0.85rem)] uppercase tracking-[0.05em] text-[#717171]">
            Komentáře komunity
          </h3>
          <div className="mt-2 max-h-40 space-y-2 overflow-y-auto">
            {wallLoading ? <p className="verox-font-myriad-regular text-sm text-[#717171]">Načítám komentáře…</p> : null}
            {!wallLoading && wallComments.length === 0 ? (
              <p className="verox-font-myriad-regular text-sm text-[#717171]">Zatím bez komentářů.</p>
            ) : (
              wallComments.map((comment) => (
                <div key={comment.id} className="border border-[#717171]/30 px-2 py-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="verox-font-myriad-bold text-[11px] text-[#F37021]">{comment.authorName}</span>
                    <span className="verox-font-myriad-regular text-[10px] text-[#717171]">{formatWallCommentAt(comment.createdAt)}</span>
                  </div>
                  <p className="verox-font-myriad-regular mt-1 text-[clamp(0.85rem,1.5vw,0.95rem)] text-[#303030]">{comment.body}</p>
                </div>
              ))
            )}
          </div>
          {wallError ? <p className="verox-font-myriad-regular mt-2 text-xs text-[#717171]">{wallError}</p> : null}
          {isAuthenticated ? (
            <div className="mt-2 flex items-end gap-2">
              <textarea
                value={wallDraft}
                onChange={(event) => onWallDraftChange(event.target.value)}
                rows={2}
                placeholder="Napište komentář…"
                className="verox-font-myriad-regular min-h-[52px] flex-1 resize-y border border-[#717171] px-2 py-1 text-sm text-[#303030] outline-none"
              />
              <button
                type="button"
                disabled={wallSubmitting}
                onClick={onAddComment}
                className="verox-font-myriad-bold border border-[#F37021] px-2 py-1 text-[10px] uppercase tracking-[0.05em] text-[#303030]"
              >
                {wallSubmitting ? "Ukládám…" : "Přidat"}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
