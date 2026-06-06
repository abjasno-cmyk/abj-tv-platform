import { AuthorCard } from "@/components/nazory/AuthorCard";
import { CommentsBlock } from "@/components/nazory/CommentsBlock";
import { CopyLinkButton } from "@/components/nazory/CopyLinkButton";
import { OpinionContent } from "@/components/nazory/OpinionContent";
import { getAuthorDisplayName } from "@/lib/nazory/display";
import { publicNazoryMediaUrl } from "@/lib/nazory/media";
import type { OpinionArticleRow, PublicAuthorProfile } from "@/lib/nazory/types";

type OpinionDetailProps = {
  article: OpinionArticleRow;
  author: PublicAuthorProfile;
  shareUrl: string;
  commentCount?: number;
};

function formatPragueDate(value: string | null): string {
  if (!value) return "";
  return new Intl.DateTimeFormat("cs-CZ", {
    timeZone: "Europe/Prague",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export function OpinionDetail({ article, author, shareUrl, commentCount = 0 }: OpinionDetailProps) {
  const heroUrl = publicNazoryMediaUrl(article.hero_image_path);
  const authorName = getAuthorDisplayName({ first_name: author.firstName, last_name: author.lastName });

  return (
    <article className="nazory-detail">
      <header className="nazory-detail-header">
        <h1 className="nazory-detail-title">{article.title}</h1>
        {article.perex ? <p className="nazory-detail-perex">{article.perex}</p> : null}
        <div className="nazory-detail-meta">
          <span>{authorName}</span>
          {article.published_at ? <span>{formatPragueDate(article.published_at)}</span> : null}
          {article.reading_time_min ? <span>{article.reading_time_min} min čtení</span> : null}
          <span>{commentCount} komentářů</span>
        </div>
        <CopyLinkButton url={shareUrl} />
      </header>

      {heroUrl ? (
        <div className="nazory-detail-hero">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={heroUrl} alt="" />
        </div>
      ) : null}

      <OpinionContent content={article.content_json} />

      <AuthorCard author={author} />

      <CommentsBlock articleId={article.id} articleTitle={article.title} />
    </article>
  );
}
