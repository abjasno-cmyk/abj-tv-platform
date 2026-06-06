import Link from "next/link";

import { OpinionList } from "@/components/nazory/OpinionList";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listPublishedArticles } from "@/lib/nazory/articles";

export const revalidate = 60;

export default async function NazoryPage() {
  let articles: Awaited<ReturnType<typeof listPublishedArticles>> = [];
  try {
    const supabase = await createSupabaseServerClient();
    articles = await listPublishedArticles(supabase, 40);
  } catch {
    articles = [];
  }

  return (
    <div className="vx-live vx-sub nazory-page">
      <div className="nazory-page-head">
        <h1 className="section-h">NÁZORY</h1>
        <p className="nazory-page-lead">Autorské texty schválených přispěvatelů VEROX.</p>
      </div>
      {articles.length > 0 ? (
        <OpinionList articles={articles} />
      ) : (
        <p className="nazory-empty">Brzy zde najdete autorské názory. Sekce se právě připravuje.</p>
      )}
      <p className="nazory-author-link">
        <Link href="/nazory/profil">Jsem autor</Link>
      </p>
    </div>
  );
}
