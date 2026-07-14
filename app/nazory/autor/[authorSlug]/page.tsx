import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Fragment } from "react";

import { NazoryAuthorsSection } from "@/components/nazory/NazoryAuthorsSection";
import { OpinionCard } from "@/components/nazory/OpinionCard";
import { getPublicAuthorBySlug, listPublicAuthorsForCatalog } from "@/lib/nazory/authors";
import { getAuthorDisplayName } from "@/lib/nazory/display";
import { publicNazoryMediaUrl } from "@/lib/nazory/media";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listPublishedArticlesByAuthor } from "@/lib/nazory/articles";
import { LOCALE_EN } from "@/lib/i18n/config";
import { localizedPath } from "@/lib/i18n/paths";
import { getRequestLocale } from "@/lib/i18n/server";
import { localizePublicAuthorProfile } from "@/lib/nazory/authorLocalization";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ authorSlug: string }>;
}): Promise<Metadata> {
  const { authorSlug } = await params;
  const supabase = await createSupabaseServerClient();
  const author = await getPublicAuthorBySlug(supabase, authorSlug);
  if (!author) return { title: "Autor nenalezen — Názory" };

  const name = getAuthorDisplayName({ first_name: author.firstName, last_name: author.lastName });
  return {
    title: `${name} — Názory`,
    description: author.bio ?? `Autorské články autora ${name} na VEROX.`,
  };
}

export default async function NazoryAuthorPage({ params }: { params: Promise<{ authorSlug: string }> }) {
  const { authorSlug } = await params;
  const locale = await getRequestLocale();
  const supabase = await createSupabaseServerClient();
  const author = await getPublicAuthorBySlug(supabase, authorSlug);
  if (!author) notFound();

  const [articles, authors] = await Promise.all([
    listPublishedArticlesByAuthor(supabase, author.userId),
    listPublicAuthorsForCatalog(supabase),
  ]);
  const name = getAuthorDisplayName({ first_name: author.firstName, last_name: author.lastName });
  const avatarUrl = publicNazoryMediaUrl(author.avatarStoragePath);
  const localizedAuthor = await localizePublicAuthorProfile(author, locale);
  const isEnglish = locale === LOCALE_EN;
  const articleCountLabel =
    localizedAuthor.publishedArticleCount === 1
      ? isEnglish
        ? "1 published article"
        : "1 publikovaný článek"
      : isEnglish
        ? `${localizedAuthor.publishedArticleCount} published articles`
        : `${localizedAuthor.publishedArticleCount} publikovaných článků`;

  return (
    <div className="vx-live vx-sub nazory-page">
      <NazoryAuthorsSection authors={authors} activeSlug={authorSlug} />

      <header className="nazory-author-page">
        <div className="nazory-author-page-head">
          <span className="nazory-author-avatar nazory-author-avatar--large">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" />
            ) : (
              <span aria-hidden="true">{author.firstName.charAt(0)}</span>
            )}
          </span>
          <div>
            <h1 className="section-h">{name}</h1>
            {localizedAuthor.title ? <p className="nazory-author-page-title">{localizedAuthor.title}</p> : null}
            {localizedAuthor.profession ? <p className="nazory-author-page-meta">{localizedAuthor.profession}</p> : null}
            {localizedAuthor.city ? <p className="nazory-author-page-meta">{localizedAuthor.city}</p> : null}
            {localizedAuthor.bio ? <p className="nazory-author-page-bio">{localizedAuthor.bio}</p> : null}
            <p className="nazory-author-page-meta">{articleCountLabel}</p>
          </div>
        </div>
        <div className="nazory-author-links">
          {author.websiteUrl ? (
            <a href={author.websiteUrl} target="_blank" rel="noopener noreferrer">
              Web
            </a>
          ) : null}
          {author.facebookUrl ? (
            <a href={author.facebookUrl} target="_blank" rel="noopener noreferrer">
              Facebook
            </a>
          ) : null}
          {author.xUrl ? (
            <a href={author.xUrl} target="_blank" rel="noopener noreferrer">
              X
            </a>
          ) : null}
          {author.linkedinUrl ? (
            <a href={author.linkedinUrl} target="_blank" rel="noopener noreferrer">
              LinkedIn
            </a>
          ) : null}
        </div>
      </header>

      <div className="double-rule channels-rule nazory-double-rule" aria-hidden="true" />

      <section className="nazory-author-articles">
        {articles.length > 0 ? (
          <>
            {articles.map((article, index) => (
              <Fragment key={article.id}>
                <OpinionCard
                  article={article}
                  author={{ name, avatarUrl }}
                  locale={locale}
                />
                {index < articles.length - 1 ? (
                  <div className="vx-strip" aria-hidden="true">
                    <span />
                    <span />
                  </div>
                ) : null}
              </Fragment>
            ))}
          </>
        ) : (
          <p className="nazory-empty">
            {isEnglish ? "This author has no published articles yet." : "Autor zatím nemá publikované články."}
          </p>
        )}
      </section>

      <p className="nazory-author-link">
        <Link href={localizedPath(locale, "/nazory")}>{isEnglish ? "Back to Opinions" : "Zpět na Názory"}</Link>
      </p>
    </div>
  );
}
