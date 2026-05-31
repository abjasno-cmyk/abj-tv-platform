import Link from "next/link";

import type { HomeVideoItem } from "@/lib/home-sections";
import { SectionLabel } from "@/components/abj/SectionLabel";
import { DayNumeral } from "@/components/abj/DayNumeral";
import { PlayMark, ArrowRight } from "@/components/abj/verox-icons";

type HomeVideoRailProps = { videos: HomeVideoItem[] };

function VideoCard({ item }: { item: HomeVideoItem }) {
  return (
    <Link
      href={`/live?videoId=${encodeURIComponent(item.videoId)}`}
      className="group flex flex-col overflow-hidden rounded-[14px] border border-verox-line bg-white shadow-[0_8px_18px_rgba(17,17,17,0.10)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_30px_rgba(17,17,17,0.16)]"
    >
      <div className="relative aspect-video w-full overflow-hidden bg-verox-ink">
        {item.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.thumbnail}
            alt={item.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : null}
        <span className="absolute left-3 top-3 vx-badge vx-badge--ink">{item.tag}</span>
        <span className="absolute inset-0 grid place-items-center">
          <span className="grid h-[58px] w-[58px] place-items-center rounded-full bg-verox-orange text-white shadow-[0_10px_24px_-8px_rgba(216,91,18,0.9)] transition-transform duration-300 group-hover:scale-110">
            <PlayMark size={22} className="translate-x-[1px]" />
          </span>
        </span>
      </div>
      <div className="flex flex-1 items-start gap-4 p-5">
        <DayNumeral day={item.day} month={item.month} size="sm" />
        <div className="min-w-0 flex-1">
          <h3 className="vx-display text-verox-ink" style={{ fontSize: "1.12rem", lineHeight: 1.06 }}>
            {item.title}
          </h3>
          <span className="vx-action mt-3 group-hover:text-verox-orange">
            Přehrát <ArrowRight size={13} />
          </span>
        </div>
      </div>
    </Link>
  );
}

// "Videa" — newest videos from the structured feed, each opening in the live player.
export function HomeVideoRail({ videos }: HomeVideoRailProps) {
  if (videos.length === 0) return null;

  return (
    <section id="videa" className="mt-10">
      <SectionLabel index="(02)" title="Videa" kicker="Nejnovější" />
      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {videos.map((item) => (
          <VideoCard key={item.videoId} item={item} />
        ))}
      </div>
    </section>
  );
}
