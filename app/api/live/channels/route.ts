import { LOCALE_CS, LOCALE_EN, type VeroxLocale } from "@/lib/i18n/config";
import { localizeLiveChannels } from "@/lib/i18n/videoTitles";
import { loadLiveChannelsForPage } from "@/lib/liveChannelsServer";

export const dynamic = "force-dynamic";

function parseLocale(value: string | null): VeroxLocale {
  return value === LOCALE_EN ? LOCALE_EN : LOCALE_CS;
}

export async function GET(request: Request) {
  const locale = parseLocale(new URL(request.url).searchParams.get("locale"));
  const channels = await loadLiveChannelsForPage();
  return Response.json({ channels: await localizeLiveChannels(channels, locale) });
}
