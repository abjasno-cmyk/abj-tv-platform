import Link from "next/link";

import { OpinionList } from "@/components/nazory/OpinionList";
import {
  canUseAuthorFeatures,
  isNazoryAdminProfile,
  loadAuthorProfileRow,
  loadProfileRoleRow,
} from "@/lib/nazory/access";
import { listPublishedArticles } from "@/lib/nazory/articles";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const revalidate = 60;

export default async function NazoryPage() {
  let articles: Awaited<ReturnType<typeof listPublishedArticles>> = [];
  let isAuthenticated = false;
  let isAuthor = false;
  let isAdmin = false;
  let profileCompleted = false;
  let authorSlug: string | null = null;

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    isAuthenticated = Boolean(user);
    articles = await listPublishedArticles(supabase, 40);

    if (user) {
      const [profile, authorProfile] = await Promise.all([
        loadProfileRoleRow(supabase, user.id),
        loadAuthorProfileRow(supabase, user.id),
      ]);
      isAdmin = isNazoryAdminProfile(profile, user.email);
      isAuthor = canUseAuthorFeatures(profile, authorProfile);
      profileCompleted = authorProfile?.profile_completed === true;
      authorSlug = authorProfile?.slug ?? null;
    }
  } catch {
    articles = [];
  }

  return (
    <div className="vx-live vx-sub nazory-page">
      <h1 className="section-h">NÁZORY</h1>
      <p className="nazory-page-lead">Autorské texty schválených přispěvatelů VEROX.</p>

      {articles.length > 0 ? (
        <OpinionList articles={articles} />
      ) : (
        <p className="nazory-empty">Brzy zde najdete autorské názory. Sekce se právě připravuje.</p>
      )}

      {isAuthenticated ? (
        <p className="nazory-author-link">
          {isAuthor ? (
            <>
              <Link href="/nazory/profil">Můj autorský profil</Link>
              {" · "}
              <Link href="/nazory/napsat">Napsat článek</Link>
              {profileCompleted && authorSlug ? (
                <>
                  {" · "}
                  <Link href={`/nazory/autor/${authorSlug}`}>Veřejná karta</Link>
                </>
              ) : null}
            </>
          ) : (
            <Link href="/nazory/profil">Aktivovat autorský profil</Link>
          )}
          {isAdmin ? (
            <>
              {" · "}
              <Link href="/nazory/sprava">Správa Názorů</Link>
            </>
          ) : null}
        </p>
      ) : (
        <p className="nazory-guest-pitch">
          Chcete psát své texty na verox.cz? Napište nám na{" "}
          <a href="mailto:info@abybylojasno.cz">info@abybylojasno.cz</a> — pošlete první článek a domluvíme se.
        </p>
      )}
    </div>
  );
}
