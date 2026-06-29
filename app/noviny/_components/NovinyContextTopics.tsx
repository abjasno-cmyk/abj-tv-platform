import Link from "next/link";

import type { NovinyContextTopicSummary } from "@/lib/noviny/types";

type NovinyContextTopicsProps = {
  topics: NovinyContextTopicSummary[];
};

export function NovinyContextTopics({ topics }: NovinyContextTopicsProps) {
  if (topics.length === 0) return null;

  return (
    <section className="rounded-2xl border border-[var(--abj-gold-dim)] bg-white p-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-abj-text2">Kontext 2.0</p>
          <h2 className="text-xl font-semibold text-abj-text1">Tematické kontexty</h2>
        </div>
        <p className="max-w-2xl text-sm text-abj-text2">
          Automaticky seskupené okruhy pomáhají číst jednotlivé zprávy v širších souvislostech.
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {topics.map((topic) => (
          <Link
            key={topic.id}
            href={`/noviny/tema/${topic.slug}`}
            className="rounded-full border border-[#FF6A00]/25 bg-[#FF6A00]/5 px-3 py-2 text-sm font-semibold text-[#8A3A00] hover:border-[#FF6A00]/45 hover:bg-[#FF6A00]/10"
          >
            {topic.name}
            <span className="ml-2 text-xs font-normal text-abj-text2">{topic.article_count}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
