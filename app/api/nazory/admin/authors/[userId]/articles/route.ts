import { AuthApiError, requireAuthenticatedUser } from "@/lib/supabase/authenticated-server";
import { requireNazoryAdmin } from "@/lib/nazory/access";
import { getAuthorProfileByUserId } from "@/lib/nazory/authors";
import { listAuthorArticlesForAdmin } from "@/lib/nazory/articles";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId } = await context.params;
    const { supabase, user } = await requireAuthenticatedUser();
    await requireNazoryAdmin(supabase, user);

    const author = await getAuthorProfileByUserId(supabase, userId);
    if (!author) {
      return Response.json({ error: "Autor nebyl nalezen." }, { status: 404 });
    }

    const articles = await listAuthorArticlesForAdmin(supabase, userId);
    return Response.json({ articles });
  } catch (error) {
    if (error instanceof AuthApiError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Články autora se nepodařilo načíst." }, { status: 500 });
  }
}
