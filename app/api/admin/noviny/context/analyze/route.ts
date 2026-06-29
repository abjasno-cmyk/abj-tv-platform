import { revalidateTag } from "next/cache";

import { AuthApiError, requireAuthenticatedUser } from "@/lib/supabase/authenticated-server";
import { requireNovinyAdmin } from "@/lib/noviny/access";
import { runNovinyContextAnalysis } from "@/lib/noviny/contextLayer";
import { enforceWriteRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const limited = enforceWriteRateLimit(request, "admin-noviny-context-analyze");
    if (limited) return limited;

    const { supabase, user } = await requireAuthenticatedUser();
    await requireNovinyAdmin(supabase, user);

    const report = await runNovinyContextAnalysis();
    revalidateTag("noviny-public", "max");
    return Response.json({ report });
  } catch (error) {
    if (error instanceof AuthApiError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    const message =
      error instanceof Error
        ? error.message
        : "Kontextová analýza Novin selhala. Ověř prosím, že je nasazen SQL soubor 020.";
    return Response.json({ error: message }, { status: 500 });
  }
}
