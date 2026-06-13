import { NextResponse } from "next/server";

import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { parseSourceUpdateInput, updateSourceForAdmin } from "@/lib/studio/sourcesAdmin";
import { requireStudioSourcesAdmin } from "@/lib/studio/sourcesAdminAuth";
import { enforceWriteRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const limited = enforceWriteRateLimit(request, "studio-sources");
  if (limited) return limited;

  const auth = await requireStudioSourcesAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const sourceId = id?.trim();
  if (!sourceId) {
    return NextResponse.json({ error: "Chybí ID kanálu." }, { status: 400 });
  }

  try {
    const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const parsed = parseSourceUpdateInput(payload);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const supabase = createSupabaseServiceClient();
    const source = await updateSourceForAdmin(supabase, sourceId, parsed.value);
    return NextResponse.json({ source });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Aktualizace kanálu selhala." },
      { status: 500 },
    );
  }
}
