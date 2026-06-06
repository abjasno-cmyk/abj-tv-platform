import { NazoryAuthorsCarousel } from "@/components/nazory/NazoryAuthorsCarousel";
import type { PublicAuthorCatalogItem } from "@/lib/nazory/authors";

type NazoryAuthorsSectionProps = {
  authors: PublicAuthorCatalogItem[];
  activeSlug?: string | null;
};

export function NazoryAuthorsSection({ authors, activeSlug = null }: NazoryAuthorsSectionProps) {
  return (
    <div className="hf nazory-authors-hf">
      <div className="double-rule channels-rule" aria-hidden="true" />
      <NazoryAuthorsCarousel authors={authors} activeSlug={activeSlug} />
    </div>
  );
}
