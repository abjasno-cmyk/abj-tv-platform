export type SocialSharePlatform = "facebook" | "x" | "whatsapp" | "telegram";

export function buildSocialShareUrl(
  platform: SocialSharePlatform,
  url: string,
  title?: string | null,
): string {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title?.trim() || "");

  switch (platform) {
    case "facebook":
      return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    case "x":
      return encodedTitle
        ? `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`
        : `https://twitter.com/intent/tweet?url=${encodedUrl}`;
    case "whatsapp": {
      const message = title?.trim() ? `${title.trim()} ${url}` : url;
      return `https://wa.me/?text=${encodeURIComponent(message)}`;
    }
    case "telegram":
      return encodedTitle
        ? `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`
        : `https://t.me/share/url?url=${encodedUrl}`;
    default:
      return url;
  }
}
