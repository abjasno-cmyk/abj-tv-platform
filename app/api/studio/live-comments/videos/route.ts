import { NextResponse } from "next/server";

import { hasStudioCapability, resolveStudioAccessContext } from "@/lib/studio/access";
import {
  listLiveCommentsProgramVideos,
  searchLiveCommentsVideosByTitle,
} from "@/lib/studio/liveCommentsVideos";

export const dynamic = "force-dynamic";

function normalize(value: string | null): string {
  return (value ?? "").trim();
}

export async function GET(request: Request) {
  const access = await resolveStudioAccessContext();

  if (!access.user) {
    return NextResponse.json({ error: "Pro přístup se přihlaste přes Google." }, { status: 401 });
  }

  if (!access.canAccessStudio) {
    return NextResponse.json({ error: "Tato stránka je dostupná pouze pro schválené studio účty." }, { status: 403 });
  }

  if (!hasStudioCapability(access, "comments_moderate")) {
    return NextResponse.json({ error: "Nemáte oprávnění moderovat komentáře." }, { status: 403 });
  }

  const url = new URL(request.url);
  const query = normalize(url.searchParams.get("q"));

  try {
    const [program, search] = await Promise.all([
      listLiveCommentsProgramVideos(),
      query.length >= 2
        ? searchLiveCommentsVideosByTitle(access.supabase, query)
        : Promise.resolve([]),
    ]);

    return NextResponse.json({
      program,
      search,
      refreshedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("live-comments videos failed", error);
    return NextResponse.json({ error: "Načtení seznamu videí selhalo." }, { status: 500 });
  }
}
