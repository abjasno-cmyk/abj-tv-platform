import { NextResponse } from "next/server";

import { createSupabaseServiceClient } from "@/lib/supabase/server";
import {
  createSourceForAdmin,
  listSourcesForAdmin,
  parseSourceCreateInput,
} from "@/lib/studio/sourcesAdmin";
import { requireStudioSourcesAdmin } from "@/lib/studio/sourcesAdminAuth";
import { enforceWriteRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireStudioSourcesAdmin();
  if (!auth.ok) return auth.response;

  try {
    const supabase = createSupabaseServiceClient();
    const sources = await listSourcesForAdmin(supabase);
    const summary = {
      total: sources.length,
      active: sources.filter((row) => row.active).length,
      needsAttention: sources.filter((row) => row.needsAttention && row.active).length,
    };
    return NextResponse.json({ sources, summary });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Načtení kanálů selhalo." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const limited = enforceWriteRateLimit(request, "studio-sources");
  if (limited) return limited;

  const auth = await requireStudioSourcesAdmin();
  if (!auth.ok) return auth.response;

  try {
    const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const parsed = parseSourceCreateInput(payload);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const supabase = createSupabaseServiceClient();
    const source = await createSourceForAdmin(supabase, parsed.value);
    return NextResponse.json({ source }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Vytvoření kanálu selhalo." },
      { status: 500 },
    );
  }
}
