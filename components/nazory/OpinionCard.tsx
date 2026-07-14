import Link from "next/link";

import { OpinionDiscussButton } from "@/components/nazory/OpinionDiscussButton";
import { LOCALE_EN, type VeroxLocale } from "@/lib/i18n/config";
import { localizedPath } from "@/lib/i18n/paths";
import type { OpinionArticleRow } from "@/lib/nazory/types";

const MONTHS = [
  "LEDEN", "ÚNOR", "BŘEZEN", "DUBEN", "KVĚTEN", "ČERVEN",
  "ČERVENEC", "SRPEN", "ZÁŘÍ", "ŘÍJEN", "LISTOPAD", "PROSINEC",
];
const MONTHS_EN = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];

export type OpinionCardAuthor = {
  name: string;
  avatarUrl: string | null;
};

type OpinionCardProps = {
  article: OpinionArticleRow;
  author?: OpinionCardAuthor | null;
  commentCount?: number;
  locale: VeroxLocale;
};

function dateParts(iso: string | null, locale: VeroxLocale): { month: string; day: string } {
  if (!iso) return { month: "", day: "" };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { month: "", day: "" };
  const months = locale === LOCALE_EN ? MONTHS_EN : MONTHS;
  return { month: months[d.getMonth()] ?? "", day: String(d.getDate()) };
}

function formatPragueStamp(iso: string | null, locale: VeroxLocale): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat(locale === LOCALE_EN ? "en-US" : "cs-CZ", {
    timeZone: "Europe/Prague",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

function authorInitial(name: string): string {
  const trimmed = name.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : "?";
}

export function OpinionCard({ article, author, commentCount = 0, locale }: OpinionCardProps) {
  const { month, day } = dateParts(article.published_at, locale);
  const isEnglish = locale === LOCALE_EN;
  const articleHref = localizedPath(locale, `/nazory/${article.slug}`);
  const authorName = author?.name?.trim() || (isEnglish ? "Author" : "Autor");
  const metaParts = [
    authorName,
    formatPragueStamp(article.published_at, locale),
    article.reading_time_min ? `${article.reading_time_min} min ${isEnglish ? "read" : "čtení"}` : null,
    commentCount > 0 ? `${commentCount} ${isEnglish ? "comments" : "komentářů"}` : null,
  ].filter(Boolean);

  return (
    <article className="kostka kostka-nazory">
      <div className="date">
        <div className="month">{month}</div>
        <div className="day">{day}</div>
      </div>
      <div className="body">
        <div className="kostka-nazory-head">
          <span className="kostka-nazory-avatar" aria-hidden="true">
            {author?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={author.avatarUrl} alt="" />
            ) : (
              authorInitial(authorName)
            )}
          </span>
          <h3>
            <Link href={articleHref}>{article.title}</Link>
          </h3>
        </div>
        <div className="src">{metaParts.join("  ·  ")}</div>
        <div className="kostka-nazory-actions nazory-detail-actions">
          <OpinionDiscussButton
            behavior="link"
            articleId={article.id}
            articleTitle={article.title}
            slug={article.slug}
          />
        </div>
        {article.perex ? <p className="kostka-nazory-perex">{article.perex}</p> : null}
        <Link href={articleHref} className="vx-arrow">
          <b>{isEnglish ? "Read full text" : "Číst celý text"}</b>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/ikona_sipka.svg" alt="" />
        </Link>
      </div>
    </article>
  );
}
