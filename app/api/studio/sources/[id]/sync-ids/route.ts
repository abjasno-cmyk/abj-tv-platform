import { NextResponse } from "next/server";

import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { syncSingleSourceChannelIds } from "@/lib/syncSourceChannelIds";
import { requireStudioSourcesAdmin, requiredYoutubeApiKey } from "@/lib/studio/sourcesAdminAuth";
import { enforceWriteRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const limited = enforceWriteRateLimit(request, "studio-sources-sync");
  if (limited) return limited;

  const auth = await requireStudioSourcesAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const sourceId = id?.trim();
  if (!sourceId) {
    return NextResponse.json({ error: "Chybí ID kanálu." }, { status: 400 });
  }

  try {
    const supabase = createSupabaseServiceClient();
    const result = await syncSingleSourceChannelIds({
      supabase,
      sourceId,
      youtubeApiKey: requiredYoutubeApiKey(),
    });

    if (result.status === "failed") {
      return NextResponse.json({ error: result.message ?? "Synchronizace ID selhala." }, { status: 422 });
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Synchronizace ID selhala." },
      { status: 500 },
    );
  }
}
