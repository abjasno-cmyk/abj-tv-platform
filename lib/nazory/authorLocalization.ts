import "server-only";

import { LOCALE_EN, type VeroxLocale } from "@/lib/i18n/config";
import { translateText } from "@/lib/i18n/translate";
import type { PublicAuthorCatalogItem } from "@/lib/nazory/authors";
import type { PublicAuthorProfile } from "@/lib/nazory/types";

async function translateField(value: string | null, maxLength: number): Promise<string | null> {
  if (!value) return null;
  return (await translateText(value, "en", maxLength)) ?? value;
}

export async function localizePublicAuthorProfile(
  author: PublicAuthorProfile,
  locale: VeroxLocale,
): Promise<PublicAuthorProfile> {
  if (locale !== LOCALE_EN) return author;

  const [title, profession, city, bio] = await Promise.all([
    translateField(author.title, 180),
    translateField(author.profession, 180),
    translateField(author.city, 120),
    translateField(author.bio, 1600),
  ]);

  return {
    ...author,
    title,
    profession,
    city,
    bio,
  };
}

export async function localizePublicAuthorCatalogItems(
  authors: PublicAuthorCatalogItem[],
  locale: VeroxLocale,
): Promise<PublicAuthorCatalogItem[]> {
  if (locale !== LOCALE_EN || authors.length === 0) return authors;

  return Promise.all(
    authors.map(async (author) => {
      const [title, profession, city, bio] = await Promise.all([
        translateField(author.title, 180),
        translateField(author.profession, 180),
        translateField(author.city, 120),
        translateField(author.bio, 900),
      ]);

      return {
        ...author,
        title,
        profession,
        city,
        bio,
      };
    }),
  );
}
