import { VIDEOS, type VideoItem } from "../data";
import { SectionLabel } from "./SectionLabel";
import { DayNumeral } from "./DayNumeral";
import { PlayMark, ArrowRight } from "./icons";

function VideoCard({ item }: { item: VideoItem }) {
  return (
    <article className="vx-card vx-card-hover group flex flex-col overflow-hidden">
      <div className="vx-frame aspect-video">
        <div className="vx-frame__scan" />
        <span className="absolute left-3 top-3 vx-badge vx-badge--ink">{item.tag}</span>
        <span
          className="absolute bottom-3 right-3 bg-black/70 px-2 py-1 text-white"
          style={{ fontFamily: "var(--vx-mono)", fontSize: "0.66rem", letterSpacing: "0.06em" }}
        >
          {item.duration}
        </span>
        <span className="vx-play" style={{ width: 58, height: 58 }}>
          <PlayMark size={22} />
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
    </article>
  );
}

export function VideoGrid() {
  return (
    <section id="videa" className="vx-shell mt-20">
      <SectionLabel index="(02)" title="Videa" kicker="Nejnovější" />
      <div className="vx-rise-group mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {VIDEOS.map((item) => (
          <VideoCard key={item.title} item={item} />
        ))}
      </div>
    </section>
  );
}
