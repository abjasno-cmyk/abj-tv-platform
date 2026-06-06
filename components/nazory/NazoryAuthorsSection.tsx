import { NazoryAuthorsCarousel } from "@/components/nazory/NazoryAuthorsCarousel";
import type { PublicAuthorCatalogItem } from "@/lib/nazory/authors";

type NazoryAuthorsSectionProps = {
  authors: PublicAuthorCatalogItem[];
  activeSlug?: string | null;
};

export function NazoryAuthorsSection({ authors, activeSlug = null }: NazoryAuthorsSectionProps) {
  return (
    <div className="hf nazory-authors-hf">
      <NazoryAuthorsCarousel authors={authors} activeSlug={activeSlug} />
      <div className="double-rule channels-rule nazory-double-rule" aria-hidden="true" />
    </div>
  );
}
