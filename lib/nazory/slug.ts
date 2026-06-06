export function slugifyText(value: string, maxLength = 80): string {
  const slug = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!slug) return "";
  return slug.slice(0, maxLength).replace(/-+$/g, "");
}

export function buildUniqueSlug(base: string, takenSlugs: Iterable<string>, fallback = "clanek"): string {
  const taken = new Set(
    [...takenSlugs]
      .map((slug) => slug.trim().toLowerCase())
      .filter((slug) => slug.length > 0),
  );
  const root = slugifyText(base) || fallback;
  if (!taken.has(root)) return root;

  let suffix = 2;
  while (taken.has(`${root}-${suffix}`)) {
    suffix += 1;
  }
  return `${root}-${suffix}`;
}

export function buildAuthorSlug(firstName: string, lastName: string, takenSlugs: Iterable<string> = []): string {
  const combined = [firstName, lastName].map((part) => part.trim()).filter(Boolean).join(" ");
  return buildUniqueSlug(combined, takenSlugs, "autor");
}

export function buildArticleSlug(title: string, takenSlugs: Iterable<string> = []): string {
  return buildUniqueSlug(title, takenSlugs, "clanek");
}
