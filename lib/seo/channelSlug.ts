import { buildUniqueSlug, slugifyText } from "@/lib/nazory/slug";

export function buildChannelSlug(channelName: string, takenSlugs: Iterable<string> = []): string {
  return buildUniqueSlug(channelName, takenSlugs, "kanal");
}

export function channelSeoPath(slug: string): string {
  return `/kanal/${encodeURIComponent(slug.trim())}`;
}

export function normalizeChannelLookupKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function buildChannelSlugIndex<T extends { channelName: string }>(
  channels: T[],
): { slugByChannelName: Map<string, string>; channelBySlug: Map<string, T> } {
  const taken = new Set<string>();
  const slugByChannelName = new Map<string, string>();
  const channelBySlug = new Map<string, T>();

  const sorted = [...channels].sort((a, b) => a.channelName.localeCompare(b.channelName, "cs-CZ"));
  for (const channel of sorted) {
    const slug = buildChannelSlug(channel.channelName, taken);
    taken.add(slug);
    slugByChannelName.set(normalizeChannelLookupKey(channel.channelName), slug);
    channelBySlug.set(slug, channel);
  }

  return { slugByChannelName, channelBySlug };
}

export function resolveChannelSlug(channelName: string, slugByChannelName: Map<string, string>): string | null {
  const key = normalizeChannelLookupKey(channelName);
  if (!key) return null;
  return slugByChannelName.get(key) ?? null;
}

export function isValidChannelSlug(slug: string): boolean {
  const trimmed = slug.trim();
  if (!trimmed) return false;
  return slugifyText(trimmed) === trimmed;
}
