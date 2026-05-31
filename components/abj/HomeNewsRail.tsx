import Link from "next/link";

import type { HomeNewsItem } from "@/lib/home-sections";
import { SectionLabel } from "@/components/abj/SectionLabel";
import { DayNumeral } from "@/components/abj/DayNumeral";
import { ArrowRight } from "@/components/abj/verox-icons";

type HomeNewsRailProps = { items: HomeNewsItem[] };

function NewsEntry({ item, ghost }: { item: HomeNewsItem; ghost: boolean }) {
  const href = item.slug ? `/jasne-zpravy/${item.slug}` : "/jasne-zpravy";
  return (
    <article className="grid grid-cols-1 gap-5 py-9 lg:grid-cols-[136px_1fr] lg:gap-8">
      <div className="shrink-0">
        <DayNumeral day={item.day} month={item.month} ghost={ghost} />
      </div>

      <div className="min-w-0">
        <Link href={href} className="group block">
          <h3
            className="vx-display text-verox-ink transition-colors group-hover:text-verox-orangeText"
            style={{ fontSize: "clamp(1.4rem, 2.6vw, 2rem)", lineHeight: 1.04 }}
          >
            {item.title}
          </h3>
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="vx-meta text-verox-orangeDeep">{item.source}</span>
          <span className="vx-meta">·</span>
          <span className="vx-meta">{item.stamp}</span>
        </div>
        {item.summary ? (
          <p className="mt-3 max-w-[70ch] text-[0.98rem] leading-relaxed text-verox-charcoal">{item.summary}</p>
        ) : null}
        <Link href={href} className="vx-action mt-4">
          Zhlédnout více <ArrowRight size={13} />
        </Link>
      </div>
    </article>
  );
}

// "V kostce" — editorial news feed wired to the published Jasné zprávy editions.
export function HomeNewsRail({ items }: HomeNewsRailProps) {
  if (items.length === 0) return null;

  return (
    <section id="vkostce" className="mt-6">
      <SectionLabel index="(01)" title="V kostce" kicker="Den po dni" />
      <div className="mt-4 divide-y-2 divide-verox-line">
        {items.map((item, i) => (
          <NewsEntry key={item.slug || `${item.day}-${item.title}`} item={item} ghost={i % 2 === 1} />
        ))}
      </div>
    </section>
  );
}
