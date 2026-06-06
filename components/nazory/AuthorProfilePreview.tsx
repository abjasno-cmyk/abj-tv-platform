import { AuthorCard } from "@/components/nazory/AuthorCard";
import type { PublicAuthorProfile } from "@/lib/nazory/types";

export function AuthorProfilePreview({
  profile,
}: {
  profile: Pick<
    PublicAuthorProfile,
    "firstName" | "lastName" | "slug" | "bio" | "title" | "avatarStoragePath"
  >;
}) {
  return (
    <section className="nazory-profile-preview">
      <h2 className="nazory-profile-preview-title">Náhled autorské karty</h2>
      <AuthorCard
        author={{
          userId: "preview",
          firstName: profile.firstName || "Jméno",
          lastName: profile.lastName || "Příjmení",
          slug: profile.slug || "autor",
          bio: profile.bio,
          title: profile.title,
          profession: null,
          city: null,
          websiteUrl: null,
          facebookUrl: null,
          xUrl: null,
          linkedinUrl: null,
          avatarStoragePath: profile.avatarStoragePath,
          publishedArticleCount: 0,
        }}
      />
    </section>
  );
}
