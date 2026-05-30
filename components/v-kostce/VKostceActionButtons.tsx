"use client";

import Link from "next/link";

import type { VKostceFeedItem } from "@/components/v-kostce/v-kostce-feed-utils";

type VKostceActionButtonsProps = {
  item: VKostceFeedItem;
  reacted: boolean;
  isReacting: boolean;
  onReact: () => void;
  onComments: () => void;
  onShare: () => void;
};

const buttonClass =
  "verox-vkostce-action-btn verox-font-myriad-bold flex w-full items-center border bg-white px-2 py-1.5 text-left uppercase tracking-[0.05em] text-[#303030]";

export function VKostceActionButtons({
  item,
  reacted,
  isReacting,
  onReact,
  onComments,
  onShare,
}: VKostceActionButtonsProps) {
  const videoAvailable = Boolean(item.videoId);
  const communityHref = videoAvailable
    ? `/komunita?video_id=${encodeURIComponent(item.videoId)}&video_title=${encodeURIComponent(item.headline)}`
    : "/komunita";

  return (
    <div className="verox-vkostce-actions flex flex-col gap-[clamp(6px,1.8vw,10px)]">
      <button
        type="button"
        disabled={reacted || isReacting}
        onClick={onReact}
        className={`${buttonClass} border-[#717171]`}
      >
        {reacted ? "Reagováno" : isReacting ? "Ukládám…" : "Reagovat"}
      </button>
      <button type="button" onClick={onComments} className={`${buttonClass} border-[#F37021]`}>
        Komentáře
      </button>
      <button type="button" onClick={onShare} className={`${buttonClass} border-[#F37021]`}>
        Přihlásit pro sdílení
      </button>
      {videoAvailable ? (
        <Link href={communityHref} className={`${buttonClass} border-[#F37021] no-underline`}>
          Do komunity
        </Link>
      ) : (
        <span className={`${buttonClass} border-[#F37021] opacity-60`}>Do komunity</span>
      )}
    </div>
  );
}
