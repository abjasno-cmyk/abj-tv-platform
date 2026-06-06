import Link from "next/link";

import { getAuthorDisplayName } from "@/lib/nazory/display";
import { publicNazoryMediaUrl } from "@/lib/nazory/media";
import type { PublicAuthorProfile } from "@/lib/nazory/types";

export function AuthorCard({ author }: { author: PublicAuthorProfile }) {
  const avatarUrl = publicNazoryMediaUrl(author.avatarStoragePath);
  const name = getAuthorDisplayName({ first_name: author.firstName, last_name: author.lastName });

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
          <span className="nazory-author-count">{author.publishedArticleCount} článků</span>
        </span>
      </Link>
    </aside>
  );
}
