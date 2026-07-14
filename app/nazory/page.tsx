import Link from "next/link";

import { NazoryAuthorsSection } from "@/components/nazory/NazoryAuthorsSection";
import { OpinionList } from "@/components/nazory/OpinionList";
import { listPublicAuthorsForCatalog } from "@/lib/nazory/authors";
import {
  canUseAuthorFeatures,
  isNazoryAdminProfile,
  loadAuthorProfileRow,
  loadProfileRoleRow,
} from "@/lib/nazory/access";
import { listPublishedArticles } from "@/lib/nazory/articles";
import { getDictionary } from "@/lib/i18n/dictionary";
import { localizedPath } from "@/lib/i18n/paths";
import { getRequestLocale } from "@/lib/i18n/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const revalidate = 60;

export default async function NazoryPage() {
  const locale = await getRequestLocale();
  const dictionary = getDictionary(locale);
  let articles: Awaited<ReturnType<typeof listPublishedArticles>> = [];
  let authors: Awaited<ReturnType<typeof listPublicAuthorsForCatalog>> = [];
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
    [articles, authors] = await Promise.all([
      listPublishedArticles(supabase, 40),
      listPublicAuthorsForCatalog(supabase),
    ]);

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
      <NazoryAuthorsSection authors={authors} />

      <h1 className="section-h">{dictionary.header.nav.opinions}</h1>

      {articles.length > 0 ? (
        <OpinionList articles={articles} locale={locale} />
      ) : (
        <p className="nazory-empty">
          {locale === "en"
            ? "Author opinions will appear here soon. This section is being prepared."
            : "Brzy zde najdete autorské názory. Sekce se právě připravuje."}
        </p>
      )}

      {isAuthenticated ? (
        <p className="nazory-author-link">
          {isAuthor ? (
            <>
              <Link href={localizedPath(locale, "/nazory/profil")}>{locale === "en" ? "My author profile" : "Můj autorský profil"}</Link>
              {" · "}
              <Link href={localizedPath(locale, "/nazory/napsat")}>{locale === "en" ? "Write an article" : "Napsat článek"}</Link>
              {profileCompleted && authorSlug ? (
                <>
                  {" · "}
                  <Link href={localizedPath(locale, `/nazory/autor/${authorSlug}`)}>{locale === "en" ? "Public card" : "Veřejná karta"}</Link>
                </>
              ) : null}
            </>
          ) : (
            <Link href={localizedPath(locale, "/nazory/profil")}>{locale === "en" ? "Activate author profile" : "Aktivovat autorský profil"}</Link>
          )}
          {isAdmin ? (
            <>
              {" · "}
              <Link href={localizedPath(locale, "/autori")}>{locale === "en" ? "Authors" : "Autoři"}</Link>
              {" · "}
              <Link href={localizedPath(locale, "/nazory/sprava")}>{locale === "en" ? "Article management" : "Správa článků"}</Link>
            </>
          ) : null}
        </p>
      ) : (
        <p className="nazory-guest-pitch">
          {locale === "en" ? (
            <>
              Would you like to publish your writing on verox.cz? Email us at{" "}
              <a href="mailto:info@abybylojasno.cz">info@abybylojasno.cz</a> — send your first article and we will get in touch.
            </>
          ) : (
            <>
              Chcete psát své texty na verox.cz? Napište nám na{" "}
              <a href="mailto:info@abybylojasno.cz">info@abybylojasno.cz</a> — pošlete první článek a domluvíme se.
            </>
          )}
        </p>
      )}
    </div>
  );
}
