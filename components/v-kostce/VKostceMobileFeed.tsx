"use client";

import { useMemo } from "react";

import { VeroxDoubleDivider } from "@/components/abj/VeroxDoubleDivider";
import { useVKostceInteractions } from "@/components/v-kostce/useVKostceInteractions";
import { mapPostToVKostceItem, sortVKostceItems } from "@/components/v-kostce/v-kostce-feed-utils";
import { VKostceCard } from "@/components/v-kostce/VKostceCard";
import { useFeed } from "@/hooks/useFeed";

const EMPTY_STATS = {
  reactionCount: 0,
  commentCount: 0,
  shareCount: 0,
  reactedByMe: false,
};

const EMPTY_MESSAGE = "Zatím tu nejsou žádné příspěvky.";

export function VKostceMobileFeed() {
  const { posts, loading, hasMore, loadMore } = useFeed();
  const items = useMemo(() => {
    const mapped = posts.map(mapPostToVKostceItem);
    return sortVKostceItems(posts, mapped);
  }, [posts]);

  const interactions = useVKostceInteractions(items);

  return (
    <div className="verox-vkostce-mobile-only verox-vkostce-mobile-shell bg-[var(--vx-white,#FFFFFF)] px-0 pb-8 pt-3 text-[#303030]">
      <div className="px-3">
      </div>

      {items.length === 0 && !loading ? (
        <p className="verox-font-myriad-regular px-3 py-6 text-[clamp(0.85rem,1.5vw,0.95rem)] tracking-[0.05em] text-[#717171]">
          {EMPTY_MESSAGE}
        </p>
      ) : (
        <div className="mt-2">
          {items.map((item, index) => {
            const social = interactions.socialByPost[item.id] ?? EMPTY_STATS;
            return (
              <div key={item.id}>
                {index > 0 ? <VeroxDoubleDivider thick className="my-[clamp(12px,2vw,18px)]" /> : null}
                <div className="px-0">
                  <VKostceCard
                    item={item}
                    isAuthenticated={interactions.isAuthenticated}
                    social={social}
                    isReacting={Boolean(interactions.reactingByPost[item.id])}
                    shareHint={interactions.shareHintByPost[item.id]}
                    wallOpen={Boolean(interactions.wallOpenByPost[item.id])}
                    wallComments={interactions.wallCommentsByPost[item.id] ?? []}
                    wallLoading={Boolean(interactions.wallLoadingByPost[item.id])}
                    wallError={interactions.wallErrorByPost[item.id]}
                    wallSubmitting={Boolean(interactions.wallSubmittingByPost[item.id])}
                    wallDraft={interactions.wallDraftByPost[item.id] ?? ""}
                    onWallDraftChange={(value) => {
                      interactions.setWallDraftByPost((prev) => ({ ...prev, [item.id]: value }));
                    }}
                    onReact={() => void interactions.handleReact(item)}
                    onComments={() => interactions.toggleComments(item)}
                    onShare={() => void interactions.handleShare(item)}
                    onAddComment={() => void interactions.addWallComment(item)}
                  />
                </div>
              </div>
            );
          })}
          {loading && items.length === 0
            ? [0, 1, 2].map((slot) => (
                <div key={`skeleton-${slot}`} className="px-3 py-4 opacity-40">
                  <div className="verox-vkostce-card-grid">
                    <div className="h-16 bg-[#717171]/20" />
                    <div className="h-24 bg-[#717171]/20" />
                  </div>
                </div>
              ))
            : null}
        </div>
      )}

      {hasMore ? (
        <div className="mt-6 flex justify-center px-3">
          <button
            type="button"
            onClick={() => void loadMore()}
            className="verox-font-myriad-bold border border-[#F37021] bg-white px-4 py-2 text-[clamp(0.85rem,1.5vw,0.95rem)] uppercase tracking-[0.05em] text-[#F37021]"
          >
            {loading ? "Načítám…" : "Načíst další"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
