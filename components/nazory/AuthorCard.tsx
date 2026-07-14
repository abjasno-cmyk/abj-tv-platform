import Link from "next/link";

import { LOCALE_EN, type VeroxLocale } from "@/lib/i18n/config";
import { getAuthorDisplayName } from "@/lib/nazory/display";
import { publicNazoryMediaUrl } from "@/lib/nazory/media";
import type { PublicAuthorProfile } from "@/lib/nazory/types";

export function AuthorCard({ author, locale = "cs" }: { author: PublicAuthorProfile; locale?: VeroxLocale }) {
  const avatarUrl = publicNazoryMediaUrl(author.avatarStoragePath);
  const name = getAuthorDisplayName({ first_name: author.firstName, last_name: author.lastName });
  const isEnglish = locale === LOCALE_EN;
  const countLabel =
    author.publishedArticleCount === 1
      ? isEnglish
        ? "1 article"
        : "1 článek"
      : isEnglish
        ? `${author.publishedArticleCount} articles`
        : `${author.publishedArticleCount} článků`;

  return (
    <aside className="nazory-author-card">
      <Link href={`/nazory/autor/${author.slug}`} className="nazory-author-card-link">
        <span className="nazory-author-avatar">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" />
          ) : (
            <span aria-hidden="true">{author.firstName.charAt(0)}</span>
          )}
        </span>
        <span className="nazory-author-body">
          <span className="nazory-author-name">{name}</span>
          {author.title ? <span className="nazory-author-title">{author.title}</span> : null}
          {author.bio ? <span className="nazory-author-bio">{author.bio}</span> : null}
          <span className="nazory-author-count">{countLabel}</span>
        </span>
      </Link>
    </aside>
  );
}
