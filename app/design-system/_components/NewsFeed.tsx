import { FEED, type FeedEntry } from "../data";
import { SectionLabel } from "./SectionLabel";
import { DayNumeral } from "./DayNumeral";
import { PlayMark, ArrowRight } from "./icons";

const ACTIONS = ["Reagovat", "Komentář", "Sdílet", "Do komunity"];

function ActionRail() {
  return (
    <div className="flex flex-row flex-wrap gap-2 lg:flex-col">
      {ACTIONS.map((label) => (
        <button key={label} type="button" className="vx-btn vx-btn--ghost-ink vx-btn--sm vx-btn--start lg:w-full">
          {label}
        </button>
      ))}
    </div>
  );
}

function NewsEntry({ entry, ghost }: { entry: FeedEntry; ghost: boolean }) {
  return (
    <article className="grid grid-cols-1 gap-5 py-9 lg:grid-cols-[136px_1fr_180px] lg:gap-8">
      <div className="shrink-0">
        <DayNumeral day={entry.day} month={entry.month} ghost={ghost} />
      </div>

      <div className="min-w-0">
        <h3
          className="vx-display text-verox-ink"
          style={{ fontSize: "clamp(1.4rem, 2.6vw, 2rem)", lineHeight: 1.04 }}
        >
          {entry.title}
        </h3>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="vx-meta text-verox-orangeDeep">{entry.source}</span>
          <span className="vx-meta">·</span>
          <span className="vx-meta">{entry.stamp}</span>
        </div>
        <p className="mt-3 max-w-[60ch] text-[0.98rem] leading-relaxed text-verox-charcoal">{entry.body}</p>
        <button type="button" className="vx-action mt-4">
          {entry.kind === "video" ? (
            <>
              <PlayMark size={13} /> Spustit video
            </>
          ) : (
            <>
              Zhlédnout více <ArrowRight size={13} />
            </>
          )}
        </button>
      </div>

      <ActionRail />
    </article>
  );
}

export function NewsFeed() {
  return (
    <section id="vkostce" className="vx-shell mt-20">
      <SectionLabel index="(01)" title="V kostce" kicker="Den po dni" />
      <div className="vx-rise-group mt-4 divide-y-2 divide-verox-line">
        {FEED.map((entry, i) => (
          <NewsEntry key={`${entry.day}-${entry.title}`} entry={entry} ghost={i % 2 === 1} />
        ))}
      </div>
    </section>
  );
}
