import { AuthorCard } from "@/components/nazory/AuthorCard";
import { CommentsBlock } from "@/components/nazory/CommentsBlock";
import { OpinionContent } from "@/components/nazory/OpinionContent";
import { OpinionDetailActions } from "@/components/nazory/OpinionDetailActions";
import { LOCALE_EN, type VeroxLocale } from "@/lib/i18n/config";
import { getAuthorDisplayName } from "@/lib/nazory/display";
import { getOpinionArticleDisplay } from "@/lib/nazory/englishOriginal";
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
  const displayArticle = getOpinionArticleDisplay(article, locale);
  const heroUrl = publicNazoryMediaUrl(displayArticle.hero_image_path);
  const authorName = getAuthorDisplayName({ first_name: author.firstName, last_name: author.lastName });
  const isEnglish = locale === LOCALE_EN;

  return (
    <article className="nazory-detail">
      <header className="nazory-detail-header">
        <h1 className="nazory-detail-title">{displayArticle.title}</h1>
        {displayArticle.perex ? <p className="nazory-detail-perex">{displayArticle.perex}</p> : null}
        <div className="nazory-detail-meta">
          <span>{authorName}</span>
          {displayArticle.published_at ? <span>{formatPragueDate(displayArticle.published_at, locale)}</span> : null}
          {displayArticle.reading_time_min ? <span>{displayArticle.reading_time_min} min {isEnglish ? "read" : "čtení"}</span> : null}
          <span>{commentCount} {isEnglish ? "comments" : "komentářů"}</span>
        </div>
        <OpinionDetailActions
          articleId={displayArticle.id}
          title={displayArticle.title}
          slug={displayArticle.slug}
          heroImagePath={displayArticle.hero_image_path}
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

      <OpinionContent content={displayArticle.content_json} />

      <AuthorCard author={author} locale={locale} />

      <CommentsBlock articleId={displayArticle.id} articleTitle={displayArticle.title} articleSlug={displayArticle.slug} />
    </article>
  );
}
