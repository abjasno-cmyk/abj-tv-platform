import Image from "next/image";

import { VeroxArrowLink } from "@/components/abj/VeroxArrowLink";
import type { VideaVideoItem } from "@/components/videa/videa-feed-utils";

type VideaVideoCardProps = {
  video: VideaVideoItem;
};

export function VideaVideoCard({ video }: VideaVideoCardProps) {
  const href = video.videoId ? `/live?videoId=${encodeURIComponent(video.videoId)}` : "/live";
  const isPortrait = video.aspect === "portrait";

  return (
    <article className="verox-videa-card py-[clamp(12px,2vw,20px)]">
      <div className="verox-videa-card-grid">
        <div className="flex flex-col items-start justify-start">
          <p className="verox-videa-month verox-font-myriad-bold uppercase tracking-[0.05em] text-[#717171]">{video.monthLabel}</p>
          <p className="verox-videa-day verox-font-myriad-bold leading-none tracking-[0.05em] text-[#F37021]">{video.dayLabel}</p>
        </div>

        <div className="relative w-full overflow-hidden bg-[#000000]">
          <div className={isPortrait ? "relative mx-auto aspect-[9/16] w-[58%] max-w-full" : "relative aspect-video w-full"}>
            <Image
              src={video.thumbnail}
              alt={video.title}
              fill
              className="object-cover"
              sizes="36vw"
              unoptimized={video.thumbnail.startsWith("http")}
            />
          </div>
        </div>

        <div className="flex min-h-full min-w-0 flex-col justify-between">
          <div>
            <h3 className="verox-videa-title verox-font-myriad-bold tracking-[0.05em] text-[#303030]">{video.title}</h3>
            <p className="verox-videa-author verox-font-myriad-bold mt-1 tracking-[0.05em] text-[#717171]">{video.channel}</p>
            {video.perex ? (
              <p className="verox-videa-perex verox-font-myriad-regular mt-2 tracking-[0.05em] text-[#717171]">{video.perex}</p>
            ) : null}
          </div>
          <div className="mt-3">
            <VeroxArrowLink href={href} />
          </div>
        </div>
      </div>
    </article>
  );
}
