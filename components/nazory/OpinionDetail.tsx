import { AuthorCard } from "@/components/nazory/AuthorCard";
import { CommentsBlock } from "@/components/nazory/CommentsBlock";
import { OpinionContent } from "@/components/nazory/OpinionContent";
import { OpinionDetailActions } from "@/components/nazory/OpinionDetailActions";
import { LOCALE_EN, type VeroxLocale } from "@/lib/i18n/config";
import { getAuthorDisplayName } from "@/lib/nazory/display";
import { publicNazoryMediaUrl } from "@/lib/nazory/media";
import type { OpinionArticleRow, PublicAuthorProfile } from "@/lib/nazory/types";

type OpinionDetailProps = {
  article: OpinionArticleRow;
  author: PublicAuthorProfile;
  shareUrl: string;
  commentCount?: number;
  editHref?: string | null;
  locale?: VeroxLocale;
};

function formatPragueDate(value: string | null, locale: VeroxLocale): string {
  if (!value) return "";
  return new Intl.DateTimeFormat(locale === LOCALE_EN ? "en-US" : "cs-CZ", {
    timeZone: "Europe/Prague",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export function OpinionDetail({ article, author, shareUrl, commentCount = 0, editHref = null, locale = "cs" }: OpinionDetailProps) {
  const heroUrl = publicNazoryMediaUrl(article.hero_image_path);
  const authorName = getAuthorDisplayName({ first_name: author.firstName, last_name: author.lastName });
  const isEnglish = locale === LOCALE_EN;

  return (
    <article className="nazory-detail">
      <header className="nazory-detail-header">
        <h1 className="nazory-detail-title">{article.title}</h1>
        {article.perex ? <p className="nazory-detail-perex">{article.perex}</p> : null}
        <div className="nazory-detail-meta">
          <span>{authorName}</span>
          {article.published_at ? <span>{formatPragueDate(article.published_at, locale)}</span> : null}
          {article.reading_time_min ? <span>{article.reading_time_min} min {isEnglish ? "read" : "čtení"}</span> : null}
          <span>{commentCount} {isEnglish ? "comments" : "komentářů"}</span>
        </div>
        <OpinionDetailActions
          articleId={article.id}
          title={article.title}
          slug={article.slug}
          heroImagePath={article.hero_image_path}
          authorName={authorName}
          shareUrl={shareUrl}
          editHref={editHref}
        />
      </header>

      {heroUrl ? (
        <div className="nazory-detail-hero">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={heroUrl} alt="" />
        </div>
      ) : null}

      <OpinionContent content={article.content_json} />

      <AuthorCard author={author} locale={locale} />

      <CommentsBlock articleId={article.id} articleTitle={article.title} articleSlug={article.slug} />
    </article>
  );
}
