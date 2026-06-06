import Link from "next/link";

import type { OpinionArticleRow } from "@/lib/nazory/types";
import { publicNazoryMediaUrl } from "@/lib/nazory/media";

type OpinionCardProps = {
  article: OpinionArticleRow;
  authorName?: string | null;
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

export function OpinionCard({ article, authorName, commentCount = 0 }: OpinionCardProps) {
  const heroUrl = publicNazoryMediaUrl(article.hero_image_path);

  return (
    <article className="nazory-card">
      <Link href={`/nazory/${article.slug}`} className="nazory-card-link">
        {heroUrl ? (
          <span className="nazory-card-thumb">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={heroUrl} alt="" loading="lazy" />
          </span>
        ) : null}
        <span className="nazory-card-body">
          <span className="nazory-card-title">{article.title}</span>
          {article.perex ? <span className="nazory-card-perex">{article.perex}</span> : null}
          <span className="nazory-card-meta">
            {authorName ? <span>{authorName}</span> : null}
            {article.published_at ? <span>{formatPragueDate(article.published_at)}</span> : null}
            {article.reading_time_min ? <span>{article.reading_time_min} min čtení</span> : null}
            {commentCount > 0 ? <span>{commentCount} komentářů</span> : null}
          </span>
        </span>
      </Link>
    </article>
  );
}
