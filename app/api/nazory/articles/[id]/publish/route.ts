import { AuthApiError, requireAuthenticatedUser } from "@/lib/supabase/authenticated-server";
import { requireAuthorWithCompletedProfile } from "@/lib/nazory/access";
import { publishArticle } from "@/lib/nazory/articles";
import { enforceWriteRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const limited = enforceWriteRateLimit(request, "nazory-publish");
    if (limited) return limited;

    const { id } = await context.params;
    const { supabase, user } = await requireAuthenticatedUser();
    await requireAuthorWithCompletedProfile(supabase, user);
    const article = await publishArticle(supabase, id, user.id);
    return Response.json({ article });
  } catch (error) {
    if (error instanceof AuthApiError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Článek se nepodařilo publikovat.";
    return Response.json({ error: message }, { status: 500 });
  }
}
