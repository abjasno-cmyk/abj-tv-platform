import Link from "next/link";
import {
  createSupabaseNewsClient,
  fetchPublishedEditionPage,
  fetchPublishedItemCountsByEditionIds,
  formatPragueDateWithWeekday,
  formatPragueTime,
  getEditionTimestamp,
  getEditionTypeLabel,
  normalizeDateFilter,
  normalizeEditionTypeFilter,
  toPragueDayKey,
  type EditionTypeFilter,
  type NewsEdition,
} from "@/lib/jasne-zpravy";

export const revalidate = 300;

const PAGE_SIZE = 30;

type RawSearchParams = Record<string, string | string[] | undefined>;

function parsePage(value: string | string[] | undefined): number {
  const first = Array.isArray(value) ? value[0] : value;
  const parsed = Number(first);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function buildArchiveHref(opts: {
  page?: number;
  type?: EditionTypeFilter | null;
  fromDate?: string | null;
  toDate?: string | null;
}): string {
  const params = new URLSearchParams();

  if (opts.page && opts.page > 1) params.set("page", String(opts.page));
  if (opts.type) params.set("type", opts.type);
  if (opts.fromDate) params.set("from", opts.fromDate);
  if (opts.toDate) params.set("to", opts.toDate);

  const qs = params.toString();
  return qs ? `/jasne-zpravy/archiv?${qs}` : "/jasne-zpravy/archiv";
}

export default async function JasneZpravyArchivePage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const raw = await searchParams;
  const page = parsePage(raw.page);
  const typeFilter = normalizeEditionTypeFilter(raw.type);
  const fromDate = normalizeDateFilter(raw.from);
  const toDate = normalizeDateFilter(raw.to);

  let supabase;
  try {
    supabase = createSupabaseNewsClient();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Neznámá chyba";
    return (
      <main className="mx-auto max-w-6xl bg-[#FBF8F2] px-4 py-12">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
          Nepodařilo se navázat připojení k datům Jasných zpráv: {message}
        </div>
      </main>
    );
  }
  const editionsRes = await fetchPublishedEditionPage(supabase, {
    page,
    pageSize: PAGE_SIZE,
    type: typeFilter,
    fromDate,
    toDate,
  });

  if (editionsRes.error) {
    return (
      <main className="mx-auto max-w-6xl bg-[#FBF8F2] px-4 py-12">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
          Nepodařilo se načíst archiv vydání: {editionsRes.error.message}
        </div>
      </main>
    );
  }

  const editions = (editionsRes.data ?? []) as NewsEdition[];
  const totalCount = editionsRes.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const countRes = await fetchPublishedItemCountsByEditionIds(
    supabase,
    editions.map((edition) => edition.id),
  );
  const itemCounts = countRes.counts;

  const groupedByDay = new Map<string, typeof editions>();
  for (const edition of editions) {
    const dayKey = toPragueDayKey(getEditionTimestamp(edition));
    const grouped = groupedByDay.get(dayKey) ?? [];
    grouped.push(edition);
    groupedByDay.set(dayKey, grouped);
  }

  const dayKeys = Array.from(groupedByDay.keys()).sort((a, b) => b.localeCompare(a));

  return (
    <main className="mx-auto max-w-6xl bg-[#FBF8F2] px-4 py-10 text-verox-ink md:py-12">
      <header className="mb-8">
        <p className="vx-kicker text-verox-orangeDeep">ABJ Newsroom</p>
        <h1 className="vx-display mt-3 text-verox-ink" style={{ fontSize: "clamp(2rem, 4.5vw, 3.4rem)", lineHeight: 1 }}>
          Archiv Jasných zpráv
        </h1>
        <hr className="vx-rule mt-4 h-[2px]" />
        <p className="vx-meta mt-4 text-verox-charcoal">
          Publikovaná vydání, řazená od nejnovějšího. Stránka {Math.min(page, totalPages)} z {totalPages}.
        </p>
      </header>

      <div className="mb-6 flex flex-wrap gap-2">
        {(
          [
            ["Vše", null],
            ["Ranní", "morning"],
            ["Polední", "noon"],
            ["Večerní", "evening"],
            ["Mimořádné / ruční", "manual"],
          ] as const
        ).map(([label, value]) => {
          const isActive = (value ?? null) === typeFilter;
          const href = buildArchiveHref({
            page: 1,
            type: value,
            fromDate,
            toDate,
          });
          return (
            <Link
              key={label}
              href={href}
              className={`vx-btn vx-btn--sm ${isActive ? "vx-btn--solid" : "vx-btn--ghost-ink"}`}
            >
              {label}
            </Link>
          );
        })}
      </div>

      {(fromDate || toDate) && (
        <p className="vx-meta mb-6 text-verox-charcoal">
          Filtr data: {fromDate ?? "od začátku"} až {toDate ?? "dnes"}.
        </p>
      )}

      {countRes.error && (
        <div className="mb-6 border-l-2 border-verox-orange bg-verox-paperDeep px-4 py-3 text-sm text-verox-charcoal">
          Počty zpráv se nepodařilo načíst pro všechna vydání.
        </div>
      )}

      {editions.length === 0 ? (
        <div className="border-2 border-verox-line bg-verox-card p-6 text-verox-charcoal">
          Pro zadané filtry nebyla nalezena žádná publikovaná vydání.
        </div>
      ) : (
        <div className="space-y-6">
          {dayKeys.map((dayKey) => {
            const dayEditions = groupedByDay.get(dayKey) ?? [];
            const dayTitle = formatPragueDateWithWeekday(getEditionTimestamp(dayEditions[0]));
            return (
              <section key={dayKey} className="border-2 border-verox-line bg-verox-card p-4 md:p-5">
                <div className="flex items-center gap-x-5 border-b-2 border-verox-line pb-2">
                  <h2 className="vx-kicker text-verox-ink">{dayTitle}</h2>
                  <hr className="vx-rule-soft mt-1 flex-1" />
                </div>
                <ul className="mt-3 divide-y-2 divide-verox-line">
                  {dayEditions.map((edition) => (
                    <li key={edition.id}>
                      <Link
                        href={`/jasne-zpravy/${edition.slug}`}
                        className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm transition hover:text-verox-orangeText"
                      >
                        <span>
                          {formatPragueTime(getEditionTimestamp(edition))} ·{" "}
                          {getEditionTypeLabel(edition.edition_type)} vydání · {itemCounts.get(edition.id) ?? 0}{" "}
                          zpráv
                        </span>
                        <span className="vx-action">otevřít →</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t-2 border-verox-line pt-5">
        {page > 1 ? (
          <Link
            href={buildArchiveHref({
              page: page - 1,
              type: typeFilter,
              fromDate,
              toDate,
            })}
            className="vx-btn vx-btn--ghost-ink vx-btn--sm"
          >
            ← Předchozí stránka
          </Link>
        ) : (
          <span className="vx-btn vx-btn--ghost-ink vx-btn--sm opacity-40">← Předchozí stránka</span>
        )}

        <p className="vx-meta text-verox-charcoal">
          {totalCount} vydání celkem · {PAGE_SIZE} na stránku
        </p>

        {page < totalPages ? (
          <Link
            href={buildArchiveHref({
              page: page + 1,
              type: typeFilter,
              fromDate,
              toDate,
            })}
            className="vx-btn vx-btn--ghost-ink vx-btn--sm"
          >
            Další stránka →
          </Link>
        ) : (
          <span className="vx-btn vx-btn--ghost-ink vx-btn--sm opacity-40">Další stránka →</span>
        )}
      </footer>
    </main>
  );
}
