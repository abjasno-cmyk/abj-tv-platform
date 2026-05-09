import {
  getCategoryLabel,
  orderedCategories,
  toCategoryGroups,
  type NewsItem,
  type NewsSource,
} from "@/lib/jasne-zpravy";

type NewsSectionsProps = {
  items: NewsItem[];
  sourcesByItem: Map<string, NewsSource[]>;
  headingLevel?: "h2" | "h3";
  className?: string;
};

function rankForSort(item: NewsItem): number {
  return item.rank ?? Number.MAX_SAFE_INTEGER;
}

export function NewsSections({
  items,
  sourcesByItem,
  headingLevel = "h2",
  className,
}: NewsSectionsProps) {
  const categories = orderedCategories(items);
  const grouped = toCategoryGroups(items);
  const SectionHeading = headingLevel;

  return (
    <div className={className}>
      {categories.map((category) => {
        const sectionItems = [...(grouped.get(category) ?? [])].sort(
          (a, b) => rankForSort(a) - rankForSort(b),
        );
        if (sectionItems.length === 0) return null;

        return (
          <section key={category} className="mb-12">
            <SectionHeading className="mb-5 flex items-center justify-between text-sm font-bold uppercase tracking-[0.18em] text-gray-600">
              <span>{getCategoryLabel(category)}</span>
              <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] tracking-normal text-gray-600">
                {sectionItems.length} zpráv
              </span>
            </SectionHeading>
            <ol className="space-y-5">
              {sectionItems.map((item, idx) => {
                const itemSources = sourcesByItem.get(item.id) ?? [];
                const shownSourceCount = itemSources.length || item.source_count || 0;
                const isFeatured = idx === 0;
                const isCuriosity = category === "curiosity";
                const cardTone = isCuriosity
                  ? "border-amber-200/80 bg-amber-50/40 hover:border-amber-300"
                  : "border-gray-200 bg-white hover:border-[#FF6A00]/40";

                return (
                  <li
                    key={item.id}
                    className={`group rounded-2xl border p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${cardTone} ${
                      isFeatured ? "md:p-6" : ""
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="inline-flex items-center rounded-full border border-[#FF6A00]/30 bg-[#FF6A00]/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#B04A00]">
                        {getCategoryLabel(category)}
                      </span>
                      <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-medium text-gray-600">
                        {shownSourceCount} zdroj{shownSourceCount === 1 ? "" : shownSourceCount < 5 ? "e" : "ů"}
                      </span>
                    </div>

                    <p className="mt-3 font-mono text-xs uppercase tracking-widest text-gray-400">
                      #{item.rank ?? idx + 1}
                    </p>

                    <h3
                      className={`mt-2 font-black leading-tight text-gray-950 ${
                        isFeatured ? "text-2xl md:text-[1.72rem]" : "text-xl"
                      }`}
                    >
                      {item.short_headline ?? item.headline}
                    </h3>

                    {item.lead && (
                      <p className="mt-3 text-[1.02rem] leading-7 text-gray-800">{item.lead}</p>
                    )}

                    {item.body && (
                      <div className="mt-4 space-y-3 whitespace-pre-line text-[15px] leading-7 text-gray-800">
                        {item.body}
                      </div>
                    )}

                    {(item.why_it_matters || item.what_to_watch) && (
                      <dl className="mt-5 grid grid-cols-1 gap-3 rounded-xl border border-gray-100 bg-gray-50/80 p-4 text-sm sm:grid-cols-2">
                        {item.why_it_matters && (
                          <div>
                            <dt className="text-xs font-bold uppercase tracking-wide text-gray-500">
                              Proč to dnes řešíme
                            </dt>
                            <dd className="mt-1.5 text-gray-800">{item.why_it_matters}</dd>
                          </div>
                        )}
                        {item.what_to_watch && (
                          <div>
                            <dt className="text-xs font-bold uppercase tracking-wide text-gray-500">
                              Co sledovat
                            </dt>
                            <dd className="mt-1.5 text-gray-800">{item.what_to_watch}</dd>
                          </div>
                        )}
                      </dl>
                    )}

                    <div className="mt-4 flex items-center gap-4 border-t border-gray-100 pt-3 text-xs font-semibold uppercase tracking-wider">
                      <span className="text-[#FF6A00]">Číst zprávu</span>
                      {itemSources.length > 0 && (
                        <a href={`#sources-${item.id}`} className="text-gray-500 hover:text-gray-700">
                          Zdroje
                        </a>
                      )}
                    </div>

                    {itemSources.length > 0 && (
                      <div id={`sources-${item.id}`} className="mt-4 border-t border-gray-100 pt-3">
                        <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                          Zdroje · {itemSources.length}
                        </p>
                        <ul className="mt-2 space-y-1.5 text-sm">
                          {itemSources.map((source) => (
                            <li key={source.id}>
                              {source.source_url ? (
                                <a
                                  href={source.source_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[#1f4f9c] hover:underline"
                                >
                                  {source.source_title ?? source.source_name ?? source.source_url}
                                </a>
                              ) : (
                                <span className="text-gray-700">
                                  {source.source_title ?? source.source_name}
                                </span>
                              )}
                              {source.source_name && source.source_title && (
                                <span className="text-gray-500"> · {source.source_name}</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
