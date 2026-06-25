import { revalidateTag } from "next/cache";

import { AuthApiError, requireAuthenticatedUser } from "@/lib/supabase/authenticated-server";
import { requireNovinyAdmin } from "@/lib/noviny/access";
import { runNovinyImport } from "@/lib/noviny/importer";
import { enforceWriteRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const limited = enforceWriteRateLimit(request, "admin-noviny-source-refresh");
    if (limited) return limited;

    const { supabase, user } = await requireAuthenticatedUser();
    await requireNovinyAdmin(supabase, user);

    const { id } = await params;
    if (!id) {
      return Response.json({ error: "ID zdroje je povinné." }, { status: 400 });
    }

    const report = await runNovinyImport({ runType: "manual", sourceId: id });
    revalidateTag("noviny-public", "max");
    return Response.json({ report });
  } catch (error) {
    if (error instanceof AuthApiError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Ruční refresh zdroje selhal.";
    return Response.json({ error: message }, { status: 500 });
  }
}
