import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const revalidate = 60;
export const dynamic = "force-dynamic";

const EDITION_TYPE_LABEL: Record<string, string> = {
  morning: "Ranní",
  noon: "Polední",
  evening: "Večerní",
  manual: "Mimořádné",
};

function formatPragueDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("cs-CZ", {
      timeZone: "Europe/Prague",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default async function JasneZpravyIndexPage() {
  const supabase = await createSupabaseServerClient();

  const { data: editions, error } = await supabase
    .from("news_editions")
    .select("id, slug, edition_type, title, subtitle, summary, published_at, generated_at")
    .eq("status", "published")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(40);

  if (error) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-bold mb-4">Jasné zprávy</h1>
        <p className="text-red-600">
          Nepodařilo se načíst vydání ze Supabase: {error.message}
        </p>
      </main>
    );
  }

  if (!editions || editions.length === 0) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-bold mb-4">Jasné zprávy</h1>
        <p className="text-gray-600">
          Zatím žádné publikované vydání. Počkej na další běh pipeline.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <header className="mb-10">
        <h1 className="text-4xl font-black tracking-tight">Jasné zprávy</h1>
        <p className="mt-2 text-gray-600">
          Redakční vydání ABJ — domácí, zahraniční, perlička dne.
        </p>
      </header>

      <ul className="space-y-4">
        {editions.map((e) => (
          <li
            key={e.id}
            className="rounded-lg border border-gray-200 bg-white p-5 transition hover:shadow-md"
          >
            <Link href={`/jasne-zpravy/${e.slug}`} className="block">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-xs font-bold uppercase tracking-widest text-red-600">
                  {EDITION_TYPE_LABEL[e.edition_type] ?? e.edition_type}
                </span>
                <time className="text-xs text-gray-500">
                  {formatPragueDateTime(e.published_at ?? e.generated_at)}
                </time>
              </div>
              <h2 className="mt-2 text-xl font-bold leading-snug">{e.title}</h2>
              {e.subtitle && (
                <p className="mt-1 text-sm text-gray-600">{e.subtitle}</p>
              )}
              {e.summary && (
                <p className="mt-3 line-clamp-2 text-sm text-gray-700">{e.summary}</p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}

