import Link from "next/link";

import { publicNazoryMediaUrl } from "@/lib/nazory/media";
import type { OpinionArticleRow } from "@/lib/nazory/types";

const MONTHS = [
  "LEDEN", "ÚNOR", "BŘEZEN", "DUBEN", "KVĚTEN", "ČERVEN",
  "ČERVENEC", "SRPEN", "ZÁŘÍ", "ŘÍJEN", "LISTOPAD", "PROSINEC",
];

export type OpinionCardAuthor = {
  name: string;
  avatarUrl: string | null;
};

type OpinionCardProps = {
  article: OpinionArticleRow;
  author?: OpinionCardAuthor | null;
  commentCount?: number;
};

function dateParts(iso: string | null): { month: string; day: string } {
  if (!iso) return { month: "", day: "" };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { month: "", day: "" };
  return { month: MONTHS[d.getMonth()] ?? "", day: String(d.getDate()) };
}

function formatPragueStamp(iso: string | null): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("cs-CZ", {
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

export function OpinionCard({ article, author, commentCount = 0 }: OpinionCardProps) {
  const { month, day } = dateParts(article.published_at);
  const authorName = author?.name?.trim() || "Autor";
  const metaParts = [
    authorName,
    formatPragueStamp(article.published_at),
    article.reading_time_min ? `${article.reading_time_min} min čtení` : null,
    commentCount > 0 ? `${commentCount} komentářů` : null,
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
            <Link href={`/nazory/${article.slug}`}>{article.title}</Link>
          </h3>
        </div>
        <div className="src">{metaParts.join("  ·  ")}</div>
        {article.perex ? <p className="kostka-nazory-perex">{article.perex}</p> : null}
        <Link href={`/nazory/${article.slug}`} className="vx-arrow">
          <b>Číst celý text</b>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/ikona_sipka.svg" alt="" />
        </Link>
      </div>
    </article>
  );
}
