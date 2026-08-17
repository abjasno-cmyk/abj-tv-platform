import { AuthApiError, requireAuthenticatedUser } from "@/lib/supabase/authenticated-server";
import { LOCALE_CS, LOCALE_EN, type VeroxLocale } from "@/lib/i18n/config";
import { localizeViewerLibraryVideos } from "@/lib/i18n/videoTitles";
import { loadMyVeroxLibraryForUser } from "@/lib/viewer/myVeroxLibrary";

export const dynamic = "force-dynamic";

function parseLocale(value: string | null): VeroxLocale {
  return value === LOCALE_EN ? LOCALE_EN : LOCALE_CS;
}

export async function GET(request: Request) {
  try {
    const locale = parseLocale(new URL(request.url).searchParams.get("locale"));
    const { supabase, user } = await requireAuthenticatedUser();
    const library = await loadMyVeroxLibraryForUser(supabase, user.id);
    const [savedVideos, watchedVideos, continueWatching] = await Promise.all([
      localizeViewerLibraryVideos(library.savedVideos, locale),
      localizeViewerLibraryVideos(library.watchedVideos, locale),
      localizeViewerLibraryVideos(library.continueWatching, locale),
    ]);
    return Response.json({
      library: {
        ...library,
        savedVideos,
        watchedVideos,
        continueWatching,
      },
    });
  } catch (error) {
    if (error instanceof AuthApiError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Nepodařilo se načíst Můj Verox.";
    return Response.json({ error: message }, { status: 500 });
  }
}
