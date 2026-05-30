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
      <main className="mx-auto max-w-6xl px-4 py-12">
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
      <main className="mx-auto max-w-6xl px-4 py-12">
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
    <main className="mx-auto max-w-6xl px-4 py-10 md:py-12">
      <header className="mb-8">
        <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-[#B04A00]">ABJ NEWSROOM</p>
        <h1 className="mt-2 text-3xl font-black text-gray-950">Archiv Jasných zpráv</h1>
        <p className="mt-2 text-sm text-gray-600">
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
              className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                isActive
                  ? "border-[#F37021] bg-[#F37021] text-white"
                  : "border-gray-200 bg-white text-gray-700 hover:border-[#F37021]/40 hover:text-[#F37021]"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>

      {(fromDate || toDate) && (
        <p className="mb-6 text-sm text-gray-600">
          Filtr data: {fromDate ?? "od začátku"} až {toDate ?? "dnes"}.
        </p>
      )}

      {countRes.error && (
        <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Počty zpráv se nepodařilo načíst pro všechna vydání.
        </div>
      )}

      {editions.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-gray-700">
          Pro zadané filtry nebyla nalezena žádná publikovaná vydání.
        </div>
      ) : (
        <div className="space-y-6">
          {dayKeys.map((dayKey) => {
            const dayEditions = groupedByDay.get(dayKey) ?? [];
            const dayTitle = formatPragueDateWithWeekday(getEditionTimestamp(dayEditions[0]));
            return (
              <section key={dayKey} className="rounded-2xl border border-gray-200 bg-white p-4 md:p-5">
                <h2 className="text-sm font-bold uppercase tracking-wider text-gray-600">{dayTitle}</h2>
                <ul className="mt-3 divide-y divide-gray-100">
                  {dayEditions.map((edition) => (
                    <li key={edition.id}>
                      <Link
                        href={`/jasne-zpravy/${edition.slug}`}
                        className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm transition hover:text-[#F37021]"
                      >
                        <span>
                          {formatPragueTime(getEditionTimestamp(edition))} ·{" "}
                          {getEditionTypeLabel(edition.edition_type)} vydání · {itemCounts.get(edition.id) ?? 0}{" "}
                          zpráv
                        </span>
                        <span className="font-semibold">otevřít →</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-5">
        {page > 1 ? (
          <Link
            href={buildArchiveHref({
              page: page - 1,
              type: typeFilter,
              fromDate,
              toDate,
            })}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:border-[#F37021]/35 hover:text-[#F37021]"
          >
            ← Předchozí stránka
          </Link>
        ) : (
          <span className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-400">
            ← Předchozí stránka
          </span>
        )}

        <p className="text-sm text-gray-600">
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
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:border-[#F37021]/35 hover:text-[#F37021]"
          >
            Další stránka →
          </Link>
        ) : (
          <span className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-400">
            Další stránka →
          </span>
        )}
      </footer>
    </main>
  );
}
