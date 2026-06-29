import type { Metadata } from "next";
import Link from "next/link";

import { searchVerox, type VeroxSearchContentType, type VeroxSearchResult } from "@/lib/search/unifiedSearch";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Vyhledávání | Verox",
  description: "Sjednocené vyhledávání napříč videi, přepisy, Zprávami a Názory na Veroxu.",
};

type SearchParams = Record<string, string | string[] | undefined>;

const TYPE_OPTIONS: Array<{ value: VeroxSearchContentType; label: string }> = [
  { value: "video", label: "Videa" },
  { value: "video_transcript", label: "Přepisy" },
  { value: "zpravy", label: "Zprávy" },
  { value: "nazory", label: "Názory" },
];

function readSingle(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function readTypes(value: string | string[] | undefined): VeroxSearchContentType[] | null {
  const raw = Array.isArray(value) ? value : value ? [value] : [];
  const allowed = new Set(TYPE_OPTIONS.map((option) => option.value));
  const parsed = raw.filter((item): item is VeroxSearchContentType => allowed.has(item as VeroxSearchContentType));
  return parsed.length > 0 ? parsed : null;
}

function typeLabel(type: VeroxSearchContentType): string {
  return TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type;
}

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("cs-CZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function ResultCard({ result }: { result: VeroxSearchResult }) {
  const date = formatDate(result.publishedAt);
  return (
    <article className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex flex-col gap-4 sm:flex-row">
        {result.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={result.thumbnailUrl}
            alt=""
            className="h-28 w-full rounded-xl object-cover sm:w-44"
            loading="lazy"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="mb-2 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
            <span>{typeLabel(result.contentType)}</span>
            {result.sourceLabel ? <span>· {result.sourceLabel}</span> : null}
            {date ? <span>· {date}</span> : null}
          </p>
          <h2 className="jz-headline text-2xl font-semibold text-neutral-950">
            <Link href={result.sourceUrl}>{result.title}</Link>
          </h2>
          {result.excerpt ? <p className="mt-3 text-sm leading-6 text-neutral-700">{result.excerpt}</p> : null}
          <Link
            href={result.sourceUrl}
            className="mt-4 inline-flex rounded-full border border-neutral-900 px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-neutral-950 hover:text-white"
          >
            Otevřít výsledek
          </Link>
        </div>
      </div>
    </article>
  );
}

export default async function VyhledavaniPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = searchParams ? await searchParams : {};
  const query = readSingle(params.q).trim();
  const selectedTypes = readTypes(params.type);

  let response: Awaited<ReturnType<typeof searchVerox>> | null = null;
  let error: string | null = null;

  if (query) {
    try {
      response = await searchVerox({ query, contentTypes: selectedTypes, limit: 24 });
    } catch (err) {
      error = err instanceof Error ? err.message : "Vyhledávání se nepodařilo spustit.";
    }
  }

  const usedSummarySources = new Set(response?.summary?.sourceIds ?? []);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="mb-8 rounded-3xl border border-neutral-200 bg-neutral-50 p-6 sm:p-8">
        <p className="jz-meta mb-3">Verox search</p>
        <h1 className="jz-headline-display text-4xl font-bold text-neutral-950 sm:text-5xl">Sjednocené vyhledávání</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-neutral-700">
          Hledání napříč videi, přepisy, Zprávami a Názory. Vrstva kombinuje full-text, toleranci překlepů
          a připravenou semantickou složku přes pgvector.
        </p>

        <form action="/vyhledavani" className="mt-6 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              name="q"
              defaultValue={query}
              placeholder="Zadejte téma, osobu, instituci nebo klíčové slovo..."
              className="min-h-12 flex-1 rounded-full border border-neutral-300 bg-white px-5 text-base outline-none focus:border-neutral-950"
            />
            <button className="rounded-full bg-neutral-950 px-7 py-3 font-semibold text-white hover:bg-neutral-800" type="submit">
              Hledat
            </button>
          </div>
          <div className="flex flex-wrap gap-3">
            {TYPE_OPTIONS.map((option) => {
              const checked = !selectedTypes || selectedTypes.includes(option.value);
              return (
                <label key={option.value} className="inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm">
                  <input type="checkbox" name="type" value={option.value} defaultChecked={checked} />
                  {option.label}
                </label>
              );
            })}
          </div>
        </form>
      </section>

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div> : null}

      {response?.summary ? (
        <section className="mb-8 rounded-3xl border border-orange-200 bg-orange-50 p-6">
          <p className="jz-meta mb-2 text-orange-800">AI souhrn z nalezených pasáží</p>
          <p className="text-lg leading-8 text-neutral-900">{response.summary.text}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {response.results
              .filter((result) => usedSummarySources.has(result.id))
              .map((result, index) => (
                <Link
                  key={result.id}
                  href={result.sourceUrl}
                  className="rounded-full border border-orange-300 bg-white px-3 py-1 text-xs font-semibold text-orange-900"
                >
                  Zdroj {index + 1}: {typeLabel(result.contentType)}
                </Link>
              ))}
          </div>
        </section>
      ) : null}

      {query && response ? (
        <section className="space-y-4">
          {response.results.length > 0 ? (
            response.results.map((result) => <ResultCard key={result.id} result={result} />)
          ) : (
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-neutral-700">
              <p>Pro tento dotaz zatím vyhledávání nevrátilo výsledek.</p>
              <p className="mt-2 text-sm text-neutral-500">
                Pokud jde o první test po nasazení, search index se musí nejprve naplnit přes
                <code className="mx-1 rounded bg-neutral-100 px-1.5 py-0.5">/api/search/index</code>
                nebo počkat na plánovaný cron.
              </p>
            </div>
          )}
        </section>
      ) : (
        <p className="rounded-2xl border border-neutral-200 bg-white p-6 text-neutral-700">
          Zadejte hledaný výraz. Index se plní odděleně od ostatních částí webu a případné selhání hledání nemá vliv
          na živé vysílání, přihlášení ani administraci.
        </p>
      )}
    </main>
  );
}
