export function publicNazoryMediaUrl(storagePath: string | null | undefined): string | null {
  const trimmed = storagePath?.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  if (!base) return null;
  return `${base}/storage/v1/object/public/nazory-media/${trimmed.replace(/^\/+/, "")}`;
}
